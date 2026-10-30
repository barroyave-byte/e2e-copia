import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { FileChange } from '../schemas/proposal';
import { resolveBinary } from '../util/resolveBinary';

const GITLEAKS_TIMEOUT_MS = 30_000;

export interface SecretsScanFinding {
  ruleId: string;
  description: string;
  path: string;
  line: number;
}

export interface SecretsScanResult {
  ok: boolean;
  findings: SecretsScanFinding[];
}

interface GitleaksFinding {
  RuleID: string;
  Description: string;
  File: string;
  StartLine: number;
}

let _gitleaksPath: string | null = null;
const assertGitleaksAvailable = (): string => {
  if (_gitleaksPath) return _gitleaksPath;
  try {
    _gitleaksPath = resolveBinary('gitleaks', ['version']);
    return _gitleaksPath;
  } catch (err) {
    throw new Error(
      `[secretsScan] ${(err as Error).message} Install it (e.g. \`brew install gitleaks\`) — ` +
        'the pre-PR secrets scan is a hard requirement, not an optional check, so this fails ' +
        'closed instead of silently skipping.',
    );
  }
};

/**
 * Scans proposed file contents for secrets before a diff can become a PR.
 * Nothing has touched the real repo/worktree yet at this point in the
 * pipeline (that happens later, in verify), so the proposed contents are
 * written to a throwaway directory and scanned there with `gitleaks detect
 * --no-git` — the same tool and default ruleset a human would run locally.
 * Fails closed: a missing gitleaks binary throws rather than silently
 * skipping the check, mirroring the prod-sre-agent client's convention for
 * required external dependencies (see jul-ia-n/CLAUDE.md).
 */
export const scanForSecrets = (changes: FileChange[]): SecretsScanResult => {
  const withContents = changes.filter(
    (c): c is FileChange & { contents: string } => Boolean(c.contents),
  );
  if (withContents.length === 0) return { ok: true, findings: [] };

  const gitleaksPath = assertGitleaksAvailable();

  const dir = mkdtempSync(join(tmpdir(), 'ai-heal-gitleaks-'));
  try {
    for (const ch of withContents) {
      const target = join(dir, ch.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, ch.contents, 'utf-8');
    }

    let stdout: string;
    try {
      stdout = execFileSync(
        gitleaksPath,
        [
          'detect',
          '--no-git',
          '--source',
          dir,
          '--report-format',
          'json',
          '--report-path',
          '-',
          '--no-banner',
          '--log-level',
          'error',
          '--exit-code',
          '0',
        ],
        { timeout: GITLEAKS_TIMEOUT_MS, encoding: 'utf-8', maxBuffer: 4 * 1024 * 1024 },
      );
    } catch (err) {
      // gitleaks itself failed to run (not "found leaks" — that path exits 0 above via
      // --exit-code 0 and is handled below). Fail closed rather than treat as clean.
      throw new Error(`[secretsScan] gitleaks failed to run: ${(err as Error).message}`);
    }

    const raw: GitleaksFinding[] = stdout.trim() ? JSON.parse(stdout) : [];
    if (raw.length === 0) return { ok: true, findings: [] };

    const findings: SecretsScanFinding[] = raw.map((f) => ({
      ruleId: f.RuleID,
      description: f.Description,
      path: f.File.startsWith(dir) ? f.File.slice(dir.length + 1) : f.File,
      line: f.StartLine,
    }));
    return { ok: false, findings };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
