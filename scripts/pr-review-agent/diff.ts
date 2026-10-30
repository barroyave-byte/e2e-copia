import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ChangedFile, detectFramework, isAuditable } from './types';

function git(args: string[], repoRoot: string): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Reads a file as it stood at the base commit, or undefined when it did not
 * exist there. A pull request that adds or renames a file has no base version,
 * which is not an error.
 */
function readAtBase(baseSha: string, filePath: string, repoRoot: string): string | undefined {
  try {
    return git(['show', `${baseSha}:${filePath}`], repoRoot);
  } catch {
    return undefined;
  }
}

/**
 * Stand-in for `headSha` meaning "the working tree as it is on disk": tracked
 * changes, staged or not, plus untracked files that are not ignored.
 *
 * It exists for a reviewer that runs before anything is committed — an author
 * checking their work, or a code agent (qa-testgen's codegen) that must leave
 * the tree uncommitted for its orchestrator. Committing to a scratch ref, or
 * `git stash create`, would do the same at the price of writing to the
 * repository the reviewer is only meant to read.
 */
export const WORKTREE = null;

/**
 * Returns the changed TypeScript files between two commits, each carrying the
 * exact set of lines the pull request adds. `headSha` set to `WORKTREE`
 * compares against the working tree instead of a commit.
 *
 * Rules report only on added lines. The test suite carries a large amount of
 * pre-existing violations, so auditing whole files would fail almost any pull
 * request that touches an older test, regardless of what it changed.
 */
export function getChangedFiles(
  baseSha: string,
  headSha: string | typeof WORKTREE,
  repoRoot: string
): ChangedFile[] {
  const nameStatus = git(
    ['diff', '--name-status', '--diff-filter=AMR', ...range(baseSha, headSha)],
    repoRoot
  )
    .split('\n')
    .filter(Boolean);

  // `git diff` never lists an untracked file, and a new spec is exactly that
  // until someone runs `git add`. Every one of its lines is an added line.
  const untracked =
    headSha === WORKTREE
      ? git(['ls-files', '--others', '--exclude-standard'], repoRoot)
          .split('\n')
          .filter(Boolean)
          .map((filePath) => `A\t${filePath}`)
      : [];

  const files: ChangedFile[] = [];

  for (const row of [...nameStatus, ...untracked]) {
    const parts = row.split('\t');
    const code = parts[0];
    // For renames, git prints the old path first and the new one last.
    const filePath = parts[parts.length - 1];
    if (!isAuditable(filePath)) continue;

    const abs = path.join(repoRoot, filePath);
    // A directory: an untracked symlink to one (a shared node_modules, say)
    // is listed as a file by ls-files.
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;

    const status = code.startsWith('A') ? 'added' : code.startsWith('R') ? 'renamed' : 'modified';
    const content = fs.readFileSync(abs, 'utf8');

    files.push({
      path: filePath,
      status,
      content,
      baseContent: status === 'added' ? undefined : readAtBase(baseSha, filePath, repoRoot),
      framework: detectFramework(content),
      addedLines: untracked.includes(row)
        ? allLines(content)
        : getAddedLines(baseSha, headSha, filePath, repoRoot),
    });
  }

  return files;
}

/** Extracts the HEAD line numbers a diff adds, by parsing `git diff -U0` hunk headers. */
export function getAddedLines(
  baseSha: string,
  headSha: string | typeof WORKTREE,
  filePath: string,
  repoRoot: string
): Set<number> {
  const added = new Set<number>();
  const diff = git(['diff', '-U0', ...range(baseSha, headSha), '--', filePath], repoRoot);

  // Hunk header format: @@ -oldStart,oldCount +newStart,newCount @@
  const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

  for (const line of diff.split('\n')) {
    const m = line.match(hunkRe);
    if (!m) continue;
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) added.add(start + i);
  }

  return added;
}

/** `git diff` endpoints: a single base compares it against the working tree. */
function range(baseSha: string, headSha: string | typeof WORKTREE): string[] {
  return headSha === WORKTREE ? [baseSha] : [baseSha, headSha];
}

function allLines(content: string): Set<number> {
  const count = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  return new Set(Array.from({ length: count }, (_, i) => i + 1));
}

export function listAllSpecFiles(repoRoot: string): string[] {
  return git(['ls-files', 'playwright/**/*.spec.ts'], repoRoot).split('\n').filter(Boolean);
}
