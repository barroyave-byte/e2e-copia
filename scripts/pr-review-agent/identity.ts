/**
 * Identity of a finding across pushes.
 *
 * A pull request is reviewed again on every push, and the agent has to answer
 * two questions about each finding it reports: *is this the same finding I
 * already commented on?* and *is this the same violation the author wrote
 * before?* They are not the same question, so there are two keys.
 *
 *  - `threadKey()` — which comment thread a finding belongs to. Literal
 *    insensitive: editing a value without fixing the violation keeps the
 *    reviewer's conversation instead of closing it and opening a new one.
 *  - `fingerprint()` — the exact violation. Changes when the line changes,
 *    which is what tells a real fix from a reworded one.
 *
 * Neither is the line number. A push that inserts an import above shifts every
 * line without changing a single finding, and a line-based key would report the
 * whole file as fixed and reintroduced.
 *
 * Both are written into a hidden marker on every inline comment, so the agent
 * can read them back from GitHub on the next run without parsing the Spanish
 * prose of its own message.
 */
import { createHash } from 'crypto';
import { ChangedFile, Finding, Severity, Source } from './types';

/** Prefix of the hidden marker, used to find it in a comment body. */
export const FINDING_MARKER_PREFIX = '<!-- dpra:';

function hash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 12);
}

/**
 * Exact identity of a finding: the rule, the file and the text of the reported
 * line.
 *
 * `occurrence` separates two hits of the same rule on two identical lines of
 * the same file.
 */
export function fingerprint(
  ruleId: string,
  file: string,
  lineText: string,
  occurrence = 0
): string {
  const normalized = lineText.trim().replace(/\s+/g, ' ');
  return hash(`${ruleId}|${file}|${normalized}|${occurrence}`);
}

/**
 * Identity of the *comment thread* a finding belongs to. Deliberately looser
 * than `fingerprint()`.
 *
 * String and numeric literals are erased before hashing, so editing a value
 * without fixing the violation — `waitForTimeout(3000)` becoming
 * `waitForTimeout(5000)` — keeps the conversation the reviewer already had
 * instead of closing it and opening a brand new thread. The exact fingerprint
 * still changes, which is the honest answer to "was this fixed?": it was not.
 *
 * `occurrence` is counted per normalised line, so two different waits in one
 * file get two threads. When one of them is fixed the survivor inherits the
 * first thread; the attribution shifts but the reviewer still sees exactly one
 * live conversation, which is the point.
 */
export function threadKey(ruleId: string, file: string, lineText: string, occurrence = 0): string {
  const normalized = lineText
    .trim()
    .replace(/\s+/g, ' ')
    // String literals first: a number inside a string must not survive as one.
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '§')
    .replace(/\b\d+(?:\.\d+)?\b/g, '#');
  return hash(`${ruleId}|${file}|${normalized}|${occurrence}`);
}

/**
 * Stamps every finding with both identities, before anything is rendered.
 *
 * Done in one place so the inline comment and the thread reconciliation agree
 * on what "the same finding" means. The occurrence counters are kept apart
 * because the two keys collapse different things: two waits with different
 * timeouts are two fingerprints but also two threads, and each needs its own
 * index.
 */
export function attachIdentity(findings: Finding[], files: ChangedFile[]): Finding[] {
  const linesByFile = new Map(files.map((f) => [f.path, f.content.split('\n')]));
  const seenExact = new Map<string, number>();
  const seenThread = new Map<string, number>();

  const next = (counter: Map<string, number>, key: string): number => {
    const occurrence = counter.get(key) ?? 0;
    counter.set(key, occurrence + 1);
    return occurrence;
  };

  return findings.map((f) => {
    // Falls back to the line number when the file is not in the diff set, which
    // only happens for a finding reported against a path the agent did not read.
    const lineText = linesByFile.get(f.file)?.[f.line - 1] ?? `L${f.line}`;

    // The LLM pass invents its own `ruleId` text on every run — the same
    // complaint about the same line has come back as `llm/dsl-architecture`
    // in one run and `llm/dsl-orchestration` in the next. Folding that into
    // the *thread* identity reopens the duplicate-comment problem this module
    // exists to solve, just scoped to LLM findings: a fresh thread on every
    // push instead of one conversation for the life of the pull request. A
    // fixed rule id keeps every LLM finding on one line in one thread instead.
    // `fingerprint` is unaffected: its job is the opposite one — noticing when
    // the wording changed, not collapsing it away.
    const threadRuleId = f.source === 'llm' ? 'llm' : f.ruleId;

    return {
      ...f,
      fingerprint: fingerprint(
        f.ruleId,
        f.file,
        lineText,
        next(seenExact, `${f.ruleId}|${f.file}|${lineText.trim()}`)
      ),
      threadKey: threadKey(
        threadRuleId,
        f.file,
        lineText,
        next(seenThread, threadKey(threadRuleId, f.file, lineText))
      ),
    };
  });
}

/* ------------------------------------------------------- comment marker I/O */

export interface FindingMarker {
  r: string;
  s: Severity;
  o: Source;
  /** Exact fingerprint. */
  f: string;
  /** Thread identity: what decides whether this comment is reused on the next push. */
  t?: string;
  pr?: number;
  run?: string;
}

/**
 * Serialises the marker appended to every inline comment.
 *
 * HTML comments are invisible in rendered Markdown, so this costs the reader
 * nothing while giving the next run an exact answer about which finding a
 * comment belongs to.
 */
export function renderFindingMarker(m: FindingMarker): string {
  return `${FINDING_MARKER_PREFIX}${JSON.stringify(m)} -->`;
}

export function parseFindingMarker(body: string): FindingMarker | null {
  const match = body.match(/<!--\s*dpra:(\{.*?\})\s*-->/s);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as FindingMarker;
    return parsed.r && parsed.f ? parsed : null;
  } catch {
    return null;
  }
}
