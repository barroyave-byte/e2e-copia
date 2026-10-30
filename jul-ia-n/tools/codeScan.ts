import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { FileChange } from '../schemas/proposal';
import { resolveBinary } from '../util/resolveBinary';

const SEMGREP_TIMEOUT_MS = 60_000;
const SEMGREP_CONFIGS = ['p/security-audit', 'p/typescript'];

// Only ERROR-severity findings block the proposal. Semgrep's community
// rulesets are tuned for general code, not a repo whose entire allowlisted
// surface is Playwright test specs (deliberately full of "fake" credentials,
// test card numbers, etc. from tools/cardPool.ts) — WARNING/INFO here has a
// real false-positive rate against that pattern. ERROR-level findings (e.g.
// command injection via child_process) are the ones worth failing closed on
// for a first rollout; the rest are logged as advisory, not blocking. Revisit
// once there's a few weeks of real findings to tune against.
const BLOCKING_SEVERITIES = new Set(['ERROR']);

export interface CodeScanFinding {
  ruleId: string;
  message: string;
  severity: string;
  path: string;
  line: number;
}

export interface CodeScanResult {
  ok: boolean;
  blocking: CodeScanFinding[];
  advisory: CodeScanFinding[];
}

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number };
  extra: { severity: string; message: string };
}

let _semgrepPath: string | null = null;
const assertSemgrepAvailable = (): string => {
  if (_semgrepPath) return _semgrepPath;
  try {
    _semgrepPath = resolveBinary('semgrep', ['--version']);
    return _semgrepPath;
  } catch (err) {
    throw new Error(
      `[codeScan] ${(err as Error).message} Install it (e.g. \`brew install semgrep\`) — the ` +
        'pre-PR code scan is a hard requirement, not an optional check, so this fails closed ' +
        'instead of silently skipping.',
    );
  }
};

/**
 * Scans proposed file contents for real vulnerability patterns (command
 * injection, unsafe eval, etc.) before a diff can become a PR — same throwaway-
 * directory approach as tools/secretsScan.ts, run alongside it in
 * enforceKindRules. Two gotchas discovered wiring this up:
 *  1. Semgrep's *default* .semgrepignore excludes paths containing "test"/
 *     "spec" — which is the entire jul-IA-N allowlist. An empty .semgrepignore
 *     written into the scan root overrides that default; --no-git-ignore alone
 *     is not enough.
 *  2. `--config auto` silently logs in to the Semgrep Registry with the
 *     project URL — not appropriate for an unattended pipeline. Named public
 *     rulesets (p/security-audit, p/typescript) avoid that.
 * Fails closed if the semgrep binary is missing, same convention as
 * secretsScan.ts / prod-sre-agent.
 */
export const scanForVulnerabilities = (changes: FileChange[]): CodeScanResult => {
  const withContents = changes.filter(
    (c): c is FileChange & { contents: string } => Boolean(c.contents),
  );
  if (withContents.length === 0) return { ok: true, blocking: [], advisory: [] };

  const semgrepPath = assertSemgrepAvailable();

  const dir = mkdtempSync(join(tmpdir(), 'ai-heal-semgrep-'));
  try {
    for (const ch of withContents) {
      const target = join(dir, ch.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, ch.contents, 'utf-8');
    }
    // Overrides semgrep's bundled default .semgrepignore (see gotcha #1 above).
    writeFileSync(join(dir, '.semgrepignore'), '', 'utf-8');

    let stdout: string;
    try {
      stdout = execFileSync(
        semgrepPath,
        [
          'scan',
          ...SEMGREP_CONFIGS.flatMap((c) => ['--config', c]),
          '--no-git-ignore',
          '--metrics=off',
          '--json',
          '--quiet',
          dir,
        ],
        { timeout: SEMGREP_TIMEOUT_MS, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 },
      );
    } catch (err) {
      throw new Error(`[codeScan] semgrep failed to run: ${(err as Error).message}`);
    }

    const parsed = stdout.trim() ? JSON.parse(stdout) : { results: [] };
    const results: SemgrepResult[] = parsed.results ?? [];
    if (results.length === 0) return { ok: true, blocking: [], advisory: [] };

    const toFinding = (r: SemgrepResult): CodeScanFinding => ({
      ruleId: r.check_id,
      message: r.extra.message,
      severity: r.extra.severity,
      path: r.path.startsWith(dir) ? r.path.slice(dir.length + 1) : r.path,
      line: r.start.line,
    });

    const findings = results.map(toFinding);
    const blocking = findings.filter((f) => BLOCKING_SEVERITIES.has(f.severity));
    const advisory = findings.filter((f) => !BLOCKING_SEVERITIES.has(f.severity));
    return { ok: blocking.length === 0, blocking, advisory };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
