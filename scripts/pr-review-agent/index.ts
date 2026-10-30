#!/usr/bin/env ts-node
/**
 * DEUNA PR Reviewer Agent: automated first-pass code review for the E2E suite.
 *
 * Runs three passes over the added lines of a pull request diff, applying the
 * standard of whichever framework each file uses:
 *   1. Deterministic rules (ts-morph AST and regex). May block the pull request.
 *   2. Zephyr Scale title comparison. Network-bound, never blocks.
 *   3. LLM advisory pass. Emits suggestions only, never blocks.
 *
 * Usage:
 *   ts-node scripts/pr-review-agent/index.ts --base <sha> --head <sha> [--dry-run] [--no-llm]
 *   ts-node scripts/pr-review-agent/index.ts --worktree [--base <sha>] [--json] [--no-llm]
 *
 * `--worktree` reviews the uncommitted working tree against `--base` (HEAD by
 * default) and never publishes. `--json` prints one JSON document on stdout
 * and every log line on stderr.
 */
import * as path from 'path';

// Before anything logs — dotenv included: with --json, stdout carries the
// document and nothing else, so a caller can parse it without scraping.
if (process.argv.includes('--json')) {
  console.log = (...args: unknown[]) => console.error(...args);
  console.info = console.log;
}

require('dotenv').config();
import { getChangedFiles, listAllSpecFiles, WORKTREE } from './diff';
import { runRules } from './rules';
import { takeDuplicateCandidates } from './rules.repo';
import { LlmStatus, runLlmPass } from './llm';
import { runZephyrTitleCheck } from './zephyr';
import { isBlocking, renderConsole, renderJson, renderSummary } from './report';
import {
  client,
  getPrTargetFromEnv,
  reconcileThreads,
  publishInlineReview,
  upsertSummaryComment,
} from './github';
import { Finding } from './types';
import { attachIdentity } from './identity';

type LlmState = LlmStatus | 'off' | 'skipped';

interface Args {
  base: string;
  /** `WORKTREE` (null) for the uncommitted working tree. */
  head: string | typeof WORKTREE;
  dryRun: boolean;
  llm: boolean;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, fallback = '') => {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
  };

  // The working tree is never a pull request: nothing is published, and the
  // default base is the commit the changes sit on, not origin/develop — PR_*
  // variables an environment happens to carry must not redirect it either.
  if (argv.includes('--worktree')) {
    return {
      base: get('--base', 'HEAD'),
      head: WORKTREE,
      dryRun: true,
      llm: !argv.includes('--no-llm'),
      json: argv.includes('--json'),
    };
  }

  return {
    base: get('--base', process.env.PR_BASE_SHA ?? 'origin/develop'),
    head: get('--head', process.env.PR_HEAD_SHA ?? 'HEAD'),
    dryRun: argv.includes('--dry-run'),
    llm: !argv.includes('--no-llm'),
    json: argv.includes('--json'),
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '../..');

  console.log(`[pr-review-agent] diff ${args.base}..${args.head ?? 'working tree'}`);

  const files = getChangedFiles(args.base, args.head, repoRoot);
  if (!files.length) {
    console.log(
      '[pr-review-agent] No auditable .ts files in this pull request. Nothing to review.'
    );
    if (args.json) emitJson([], [], args, false, 'skipped');
    return 0;
  }

  console.log(
    `[pr-review-agent] ${files.length} file(s): ` +
      files.map((f) => `${f.path} (${f.framework}, +${f.addedLines.size})`).join(', ')
  );

  // 1) Pasada determinista.
  const astFindings = runRules(files, {
    repoRoot,
    allSpecFiles: listAllSpecFiles(repoRoot),
  });

  // Kept separate from the AST rules because it performs network calls; every
  // failure mode degrades to "check skipped" rather than failing the run.
  const zephyr = await runZephyrTitleCheck(files);

  // Runs regardless of whether the AST pass blocks. Withholding advisory
  // findings until the blocking ones are fixed costs the author a second review
  // cycle for feedback that was already available, and the two passes report on
  // different things by construction: the prompt forbids repeating AST checks.
  let llmFindings: Finding[] = [];
  let llmState: LlmState = args.llm ? 'no-key' : 'off';
  let llmProvider: string | undefined;

  if (args.llm) {
    // Duplicate candidates come from the AST index; the LLM judges whether the
    // matched pairs are genuinely the same behaviour.
    const llm = await runLlmPass(files, repoRoot, takeDuplicateCandidates());
    llmFindings = llm.findings;
    llmState = llm.status;
    llmProvider = llm.provider;
  }

  // Stamped before anything is rendered: the inline comment carries the
  // finding's identity, which is what lets the next run recognise its own
  // comment instead of deleting it and posting a new one.
  const findings = attachIdentity([...astFindings, ...zephyr.findings, ...llmFindings], files);
  console.log(renderConsole(findings));

  const blocking = isBlocking(findings);
  if (args.json) emitJson(findings, files, args, zephyr.ran, llmState);

  const target = getPrTargetFromEnv();

  if (args.dryRun || !target) {
    console.log(
      args.dryRun
        ? '[pr-review-agent] --dry-run: nothing is published to GitHub.'
        : '[pr-review-agent] No pull request context (PR_NUMBER/PR_HEAD_SHA): nothing is published.'
    );
    console.log('\n----- summary that would be published -----\n');
    console.log(
      renderSummary(findings, files, {
        llmState,
        zephyrRan: zephyr.ran,
        llmProvider,
        postedInline: 0,
        published: false,
      })
    );
    return blocking ? 1 : 0;
  }

  const octokit = client();

  const runUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;

  // Reconciles against the threads already on the pull request instead of
  // wiping them: a finding keeps one thread, with its conversation, for the
  // life of the pull request.
  const threads = await reconcileThreads(octokit, target, findings);

  let postedInline = 0;
  if (threads.toPost.length) {
    postedInline = await publishInlineReview(
      octokit,
      target,
      threads.toPost,
      '🤖 **DEUNA PR Reviewer Agent** — hallazgos nuevos abajo. Resumen completo en el comentario fijado.'
    );
  }

  // The summary stays a single editable comment, updated on every push.
  await upsertSummaryComment(
    octokit,
    target,
    renderSummary(findings, files, {
      llmState,
      zephyrRan: zephyr.ran,
      llmProvider,
      runUrl,
      postedInline,
      silenced: threads.silenced,
      autoResolved: threads.autoResolved,
      published: true,
    })
  );

  return blocking ? 1 : 0;
}

function emitJson(
  findings: Finding[],
  files: Parameters<typeof renderJson>[1],
  args: Args,
  zephyrRan: boolean,
  llmState: string
): void {
  // process.stdout, not console.log: that one goes to stderr under --json.
  process.stdout.write(
    JSON.stringify(
      renderJson(findings, files, { base: args.base, head: args.head, zephyrRan, llmState })
    ) + '\n'
  );
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // An agent crash must not block the pull request: report it and exit clean.
    console.error('[pr-review-agent] Unexpected error:', err);
    process.exit(0);
  });
