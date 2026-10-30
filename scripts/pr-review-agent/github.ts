import { Octokit } from '@octokit/rest';
import { Finding } from './types';
import { COMMENT_MARKER, renderInlineComment } from './report';
import { parseFindingMarker } from './identity';

export interface PrTarget {
  owner: string;
  repo: string;
  pull_number: number;
  head_sha: string;
}

export function getPrTargetFromEnv(): PrTarget | null {
  const repoSlug = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  const headSha = process.env.PR_HEAD_SHA;
  if (!repoSlug || !prNumber || !headSha) return null;

  const [owner, repo] = repoSlug.split('/');
  return { owner, repo, pull_number: Number(prNumber), head_sha: headSha };
}

export function client(): Octokit {
  const auth = process.env.GITHUB_TOKEN;
  if (!auth) throw new Error('GITHUB_TOKEN ausente: el agente no puede publicar en el PR.');
  return new Octokit({ auth });
}

/**
 * Number of inline comments per review request.
 *
 * A single review carrying every finding of a large pull request can be
 * rejected outright, which would cost all of the inline comments. Batching
 * keeps each request small enough to be accepted, and a rejected batch only
 * costs its own comments.
 */
const COMMENTS_PER_REVIEW = 30;

/**
 * Publishes every finding as inline comments, in batches.
 *
 * GitHub answers 422 for any comment whose line falls outside the pull request
 * diff. Findings are already restricted to added lines, but a rejected batch is
 * retried comment by comment so one bad line cannot discard the rest.
 *
 * @returns the number of inline comments that were published.
 */
export async function publishInlineReview(
  octokit: Octokit,
  target: PrTarget,
  findings: Finding[],
  summaryBody: string
): Promise<number> {
  const comments = findings.map((f) => ({
    path: f.file,
    line: f.line,
    side: 'RIGHT' as const,
    body: renderInlineComment(f),
  }));

  const batches: (typeof comments)[] = [];
  for (let i = 0; i < comments.length; i += COMMENTS_PER_REVIEW) {
    batches.push(comments.slice(i, i + COMMENTS_PER_REVIEW));
  }
  // With no findings, a single empty review still carries the summary body.
  if (!batches.length) batches.push([]);

  let posted = 0;

  for (const [index, batch] of batches.entries()) {
    // Posted as COMMENT rather than REQUEST_CHANGES. Merges are gated by the
    // job's exit code through a required status check, and a bot requesting
    // changes would additionally need a manual dismissal on every push.
    // Only the first review carries the body, so the note appears once.
    const body = index === 0 ? summaryBody : undefined;

    try {
      await octokit.pulls.createReview({
        ...target,
        commit_id: target.head_sha,
        event: 'COMMENT',
        body,
        comments: batch,
      });
      posted += batch.length;
      continue;
    } catch (err: any) {
      if (err?.status !== 422) throw err;
    }

    // The batch was rejected as a whole; salvage the comments GitHub accepts.
    console.error(
      `[pr-review-agent] Batch ${index + 1} rejected (lines outside the diff). Retrying individually.`
    );

    if (body) {
      await octokit.pulls
        .createReview({ ...target, commit_id: target.head_sha, event: 'COMMENT', body })
        .catch(() => undefined);
    }

    for (const comment of batch) {
      try {
        await octokit.pulls.createReview({
          ...target,
          commit_id: target.head_sha,
          event: 'COMMENT',
          comments: [comment],
        });
        posted++;
      } catch {
        // A single unplaceable comment is dropped; it stays in the summary.
      }
    }
  }

  return posted;
}

/**
 * Keeps exactly one summary comment per pull request, editing the existing one
 * instead of appending a new comment on every push.
 */
export async function upsertSummaryComment(
  octokit: Octokit,
  target: PrTarget,
  body: string
): Promise<void> {
  const { data: comments } = await octokit.issues.listComments({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.pull_number,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.issues.updateComment({
      owner: target.owner,
      repo: target.repo,
      comment_id: existing.id,
      body,
    });
    return;
  }

  await octokit.issues.createComment({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.pull_number,
    body,
  });
}

/* -------------------------------------------------- thread reconciliation */

/**
 * One comment thread the agent owns on this pull request.
 *
 * `id` is the GraphQL node id of the thread, which is what `resolveReviewThread`
 * takes; the REST comment id is kept for deleting pre-marker comments.
 */
interface AgentThread {
  id: string;
  commentId: number;
  commentNodeId: string;
  /** Read from the hidden marker. Absent on comments written before markers existed. */
  threadKey?: string;
  /** Exact-content identity from the hidden marker, used to tell a real edit from GitHub losing track of the position. */
  fingerprint?: string;
  isResolved: boolean;
  isOutdated: boolean;
  canResolve: boolean;
  replies: number;
}

export interface Reconciliation {
  /** Findings with no live thread: the only ones that get a new comment. */
  toPost: Finding[];
  /** Findings whose thread a human resolved. They go in the summary, not inline. */
  silenced: Finding[];
  /** Threads the agent closed because the finding is gone from this run. */
  autoResolved: number;
  /** Pre-marker comments from earlier runs, cleared once during the migration. */
  legacyCleared: number;
}

const THREADS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          viewerCanResolve
          comments(first: 1) {
            totalCount
            nodes { id databaseId body }
          }
        }
      }
    }
  }
}`;

/** Recognises a comment this agent wrote, including the ones without a marker. */
const AGENT_COMMENT_RE = /regla estática|revisión IA/;

async function fetchAgentThreads(octokit: Octokit, target: PrTarget): Promise<AgentThread[]> {
  const threads: AgentThread[] = [];
  let cursor: string | null = null;

  do {
    const res: any = await octokit.graphql(THREADS_QUERY, {
      owner: target.owner,
      repo: target.repo,
      number: target.pull_number,
      cursor,
    });
    const page = res?.repository?.pullRequest?.reviewThreads;
    if (!page) break;

    for (const node of page.nodes ?? []) {
      // The agent's comment always opens the thread; anything after it is a reply.
      const root = node.comments?.nodes?.[0];
      if (!root?.body) continue;

      const marker = parseFindingMarker(root.body);
      if (!marker && !AGENT_COMMENT_RE.test(root.body)) continue;

      threads.push({
        id: node.id,
        commentId: root.databaseId,
        commentNodeId: root.id,
        // `t` is the thread identity; `f` is the fallback for a comment written
        // before the two were split apart.
        threadKey: marker ? (marker.t ?? marker.f) : undefined,
        fingerprint: marker?.f,
        isResolved: Boolean(node.isResolved),
        isOutdated: Boolean(node.isOutdated),
        canResolve: Boolean(node.viewerCanResolve),
        replies: Math.max(0, (node.comments?.totalCount ?? 1) - 1),
      });
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  return threads;
}

async function resolveThread(octokit: Octokit, threadId: string): Promise<boolean> {
  try {
    await octokit.graphql(
      `mutation($id: ID!) {
        resolveReviewThread(input: { threadId: $id }) { thread { id } }
      }`,
      { id: threadId }
    );
    return true;
  } catch {
    // Resolving is cosmetic: the summary comment still reports the fix.
    return false;
  }
}

/**
 * Reconciles the findings of this run against the threads already on the pull
 * request, instead of deleting every comment and posting them all again.
 *
 * The delete-and-repost approach it replaces destroyed the reviewer's work: a
 * thread that someone answered and resolved was removed and recreated from
 * scratch on the next push, arriving as a brand new, unresolved comment with no
 * conversation in it. The same finding therefore had to be reviewed again on
 * every push, and three runs on one pull request left 149 comments for 29 real
 * findings.
 *
 * Reconciling gives one thread per finding for the life of the pull request:
 *
 * | Thread                       | Finding still reported | Action                          |
 * | ---------------------------- | ----------------------- | ------------------------------- |
 * | none                         | yes                     | post a new comment              |
 * | open                         | yes                     | leave it alone                  |
 * | resolved                     | yes                     | leave it alone, report silenced |
 * | outdated, content changed    | yes                     | post again: the live one is buried and the wording is stale |
 * | outdated, content unchanged  | yes                     | leave it alone                  |
 * | open                         | no                      | resolve it                      |
 *
 * Leaving an open thread alone is enough because GitHub re-anchors a comment
 * forward to the newest commit where it still applies, and collapses it as
 * outdated when the line is gone.
 *
 * `outdated` fires far more often than "the line moved" — confirmed on
 * sandbox PR #3612, it fires on every push that advances the pull request's
 * base branch, and on any push that edits the same file anywhere near the
 * finding's line, whether or not the finding's own line changed. Reposting on
 * every one of those would recreate the exact pile-up this reconciliation was
 * built to remove — three runs, 149 comments, 29 real findings — just spread
 * across ordinary pushes instead of the delete-and-repost design that came
 * before it. `fingerprint` is what tells the two apart: it hashes the exact
 * reported line, so it is unaffected by the position getting lost, and it
 * changes if and only if the line's own text changed. Only a fingerprint
 * mismatch means there is new information worth surfacing again.
 *
 * Resolving a thread silences the comment; it does not lift the check. The
 * blocking decision is read from the findings, never from the threads, so a
 * resolved conversation cannot wave a violation through — which is why the
 * silenced ones have to be listed in the summary comment.
 */
export async function reconcileThreads(
  octokit: Octokit,
  target: PrTarget,
  findings: Finding[]
): Promise<Reconciliation> {
  const threads = await fetchAgentThreads(octokit, target);

  // Pre-marker comments cannot be matched to a finding, so they are cleared the
  // way they used to be. Delete this branch once no open pull request predates
  // the marker.
  const legacy = threads.filter((t) => !t.threadKey);
  for (const thread of legacy) {
    try {
      if (thread.replies) {
        await octokit.graphql(
          `mutation($id: ID!) {
            minimizeComment(input: { subjectId: $id, classifier: OUTDATED }) {
              clientMutationId
            }
          }`,
          { id: thread.commentNodeId }
        );
      } else {
        await octokit.pulls.deleteReviewComment({
          owner: target.owner,
          repo: target.repo,
          comment_id: thread.commentId,
        });
      }
    } catch {
      // Clearing is cosmetic, so a failure here is ignored.
    }
  }

  // First thread wins: a duplicate can only come from an earlier bug, and
  // picking one keeps the behaviour deterministic.
  const byKey = new Map<string, AgentThread>();
  for (const thread of threads) {
    if (thread.threadKey && !byKey.has(thread.threadKey)) byKey.set(thread.threadKey, thread);
  }

  const toPost: Finding[] = [];
  const silenced: Finding[] = [];
  const liveKeys = new Set<string>();

  for (const finding of findings) {
    const key = finding.threadKey;
    if (!key) {
      toPost.push(finding);
      continue;
    }
    liveKeys.add(key);

    const thread = byKey.get(key);
    if (!thread) {
      toPost.push(finding);
    } else if (thread.isResolved) {
      silenced.push(finding);
    } else if (thread.isOutdated && thread.fingerprint !== finding.fingerprint) {
      // The thread survives but GitHub has collapsed it out of view *and* the
      // reported line's content actually changed — there is new information,
      // so the live one would otherwise be reported to nobody.
      toPost.push(finding);
    }
    // else: outdated but the fingerprint still matches — GitHub lost track of
    // the position, not us. Reposting an unchanged finding here is what
    // recreates the comment pile-up on every base-branch push; leave the
    // buried comment as the record. The check still blocks on `findings`
    // regardless of whether anyone can see this comment right now.
  }

  // Everything the agent reported before and no longer reports: the code that
  // triggered it is gone. Resolved silently — a reply per fixed finding is one
  // notification per finding, which is the noise this whole change removes.
  let autoResolved = 0;
  for (const [key, thread] of byKey) {
    if (liveKeys.has(key) || thread.isResolved || !thread.canResolve) continue;
    if (await resolveThread(octokit, thread.id)) autoResolved++;
  }

  console.log(
    `[pr-review-agent] Threads: ${toPost.length} new, ` +
      `${findings.length - toPost.length - silenced.length} already open, ` +
      `${silenced.length} silenced by a reviewer, ${autoResolved} resolved as fixed` +
      (legacy.length ? `, ${legacy.length} pre-marker comment(s) cleared` : '') +
      '.'
  );

  return { toPost, silenced, autoResolved, legacyCleared: legacy.length };
}
