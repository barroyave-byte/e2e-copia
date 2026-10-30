#!/usr/bin/env ts-node
/**
 * Verification fixture for `--worktree` and `--json`.
 *
 * Builds a throwaway git repository and checks what the reviewer sees in its
 * working tree, because that is what a caller reviewing uncommitted work —
 * qa-testgen's codegen agent among them — depends on: a new spec nobody has
 * `git add`ed yet must be reviewed whole, an edited file only on its new
 * lines, and an ignored file not at all. Then runs the CLI to check that
 * `--json` leaves nothing but the document on stdout. Run it after touching
 * `diff.ts`, `index.ts` or `renderJson`:
 *
 *   npm run pr-review:check-worktree
 *
 * Exits 1 on any failed check.
 */
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getChangedFiles, WORKTREE } from './diff';
import { JSON_REPORT_SCHEMA, renderJson } from './report';
import { Finding } from './types';

let failed = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) failed++;
  console.log(`${cond ? '✅' : '❌'} ${label}`);
};

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-worktree-'));
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), content);
};

try {
  git('init', '-q');
  git('config', 'user.email', 'check@example.com');
  git('config', 'user.name', 'check');
  write('.gitignore', 'playwright/ignored/\n');
  write('playwright/tests/old.spec.ts', 'line 1\nline 2\nline 3\n');
  write('playwright/tests/staged.spec.ts', 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');

  write('playwright/tests/new.spec.ts', 'one\ntwo\nthree\n'); // untracked
  write('playwright/tests/old.spec.ts', 'line 1\nline 2 changed\nline 3\nline 4\n'); // unstaged edit
  write('playwright/tests/staged.spec.ts', 'a\nb\n');
  git('add', 'playwright/tests/staged.spec.ts'); // staged edit
  write('playwright/ignored/skip.spec.ts', 'x\n'); // gitignored
  write('notes.md', 'not auditable\n');

  const files = getChangedFiles('HEAD', WORKTREE, repo);
  const byPath = new Map(files.map((f) => [f.path, f]));
  const lines = (p: string) => [...(byPath.get(p)?.addedLines ?? [])].sort((a, b) => a - b);

  console.log('--worktree: lo que ve el reviewer en el árbol sin commitear');
  ok(
    'un spec sin `git add` se revisa entero',
    lines('playwright/tests/new.spec.ts').join() === '1,2,3'
  );
  ok('y cuenta como agregado', byPath.get('playwright/tests/new.spec.ts')?.status === 'added');
  ok(
    'un archivo editado sin stage: solo sus líneas nuevas',
    lines('playwright/tests/old.spec.ts').join() === '2,4'
  );
  ok(
    'un archivo editado en stage también se ve',
    lines('playwright/tests/staged.spec.ts').join() === '2'
  );
  ok(
    'el archivo editado conserva su versión base',
    byPath.get('playwright/tests/old.spec.ts')?.baseContent === 'line 1\nline 2\nline 3\n'
  );
  ok('lo ignorado por .gitignore no se revisa', !byPath.has('playwright/ignored/skip.spec.ts'));
  ok('lo que no es auditable no se revisa', !byPath.has('notes.md'));

  // The commit range mode must not have changed: committed, the same edits
  // are reported exactly as a pull request would see them.
  git('add', '-A');
  git('commit', '-q', '-m', 'head');
  const committed = getChangedFiles('HEAD~1', 'HEAD', repo);
  console.log('\n--base/--head: el modo de siempre');
  ok(
    'mismas líneas que en el árbol',
    committed
      .map((f) => `${f.path}:${[...f.addedLines].join('|')}`)
      .sort()
      .join() ===
      files
        .map((f) => `${f.path}:${[...f.addedLines].join('|')}`)
        .sort()
        .join()
  );
  ok(
    'con el árbol limpio, --worktree no ve nada',
    getChangedFiles('HEAD', WORKTREE, repo).length === 0
  );

  console.log('\n--json: el documento');
  const finding: Finding = {
    ruleId: 'no-static-wait',
    severity: 'error',
    file: 'playwright/tests/new.spec.ts',
    line: 2,
    title: 't',
    message: 'm',
    source: 'ast',
    suggestionSpan: 2,
  };
  const advisory: Finding = { ...finding, severity: 'error', source: 'llm', line: 1 };
  const doc = renderJson([finding, advisory], files, {
    base: 'HEAD',
    head: null,
    zephyrRan: false,
    llmState: 'off',
  });
  ok('lleva la versión del esquema', doc.schema === JSON_REPORT_SCHEMA);
  ok('bloquea por un error de una regla determinista', doc.blocking);
  ok(
    'un error que no viene del AST no bloquea',
    !renderJson([advisory], files, { base: 'HEAD', head: null, zephyrRan: false, llmState: 'ok' })
      .blocking
  );
  ok('cuenta por severidad', doc.counts.error === 2 && doc.counts.warning === 0);
  ok('ordena por archivo y línea', doc.findings[0].line === 1);
  ok('no expone campos de presentación', !('suggestionSpan' in doc.findings[0]));
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}

// The CLI end to end, on this repository: whatever the tree holds, stdout
// must parse as one document — dotenv's banner and every progress line go to
// stderr.
console.log('\n--json: la CLI');
const cli = spawnSync(
  'npx',
  [
    'ts-node',
    '-r',
    'tsconfig-paths/register',
    path.join(__dirname, 'index.ts'),
    '--worktree',
    '--json',
    '--no-llm',
  ],
  { encoding: 'utf8', env: { ...process.env, ZEPHYR_ACCESS_TOKEN: '' } }
);
let parsed: { schema?: number; head?: unknown } = {};
try {
  parsed = JSON.parse(cli.stdout);
} catch {
  // reported below
}
ok('stdout es un único documento JSON', parsed.schema === JSON_REPORT_SCHEMA);
ok('head es null en --worktree', parsed.head === null);
ok('los logs van a stderr', cli.stderr.includes('[pr-review-agent]'));

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
