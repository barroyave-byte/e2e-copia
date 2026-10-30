import { execFileSync } from 'child_process';

// Homebrew's shellenv (which puts these on PATH) is only sourced by login/
// interactive shells (.zprofile/.zshrc). Any process spawned without that
// profile — an IDE task runner, a CI step, a cron job, a child process of
// another tool — inherits a minimal PATH that omits them even though the
// binary is genuinely installed. Checked in this order after the bare PATH
// lookup; first match wins.
const FALLBACK_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin'];

/**
 * Resolves an external CLI dependency to a runnable path, tolerating the
 * common case where PATH lacks the directory it's installed in. Still fails
 * closed (throws) if the binary can't be found anywhere checked — this does
 * not weaken the secretsScan/codeScan "hard requirement" guarantee, it just
 * makes discovery resilient to how the ai-heal process happens to be
 * launched.
 */
export const resolveBinary = (name: string, versionArgs: string[]): string => {
  const candidates = [name, ...FALLBACK_DIRS.map((dir) => `${dir}/${name}`)];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, versionArgs, { timeout: 5000, stdio: 'pipe' });
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `"${name}" binary not found (tried PATH and ${FALLBACK_DIRS.join(', ')}).`,
  );
};
