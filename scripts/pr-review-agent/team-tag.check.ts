#!/usr/bin/env ts-node
/**
 * Verification fixture for `team-tag-required`.
 *
 * The rule mirrors the team-tag half of `.github/workflows/team-tag-validation.yml`
 * and reads its list of valid tags from that file, so this builds a throwaway
 * repository with its own workflow and checks that the reviewer reports a new
 * spec the workflow would block, and nothing it would let through. Run it
 * after touching the rule or the workflow:
 *
 *   npm run pr-review:check-team-tag
 *
 * Exits 1 on any failed check.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TEAM_TAG_WORKFLOW, validTeamTags } from './rules.repo';
import { runRules } from './rules';
import { ChangedFile, detectFramework } from './types';

let failed = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) failed++;
  console.log(`${cond ? '✅' : '❌'} ${label}`);
};

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-team-tag-'));
const noWorkflow = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-team-tag-none-'));
fs.mkdirSync(path.join(repo, path.dirname(TEAM_TAG_WORKFLOW)), { recursive: true });
fs.writeFileSync(
  path.join(repo, TEAM_TAG_WORKFLOW),
  'run: |\n  VALID_TAGS="@team_admin @team_enterprise @team_qa"\n'
);

const spec = (tags: string) =>
  [
    "import { TestingFramework } from '@framework/core';",
    '',
    "test.describe('@regression Login', () => {",
    `  test('@QA-T1 Login exitoso', { tag: [${tags}] }, async () => {});`,
    '});',
    '',
  ].join('\n');

function file(
  p: string,
  content: string,
  status: ChangedFile['status'] = 'added',
  baseContent?: string
): ChangedFile {
  const lines = content.split('\n').length;
  return {
    path: p,
    content,
    baseContent,
    status,
    framework: detectFramework(content),
    addedLines: new Set(Array.from({ length: lines }, (_, i) => i + 1)),
  };
}

function findings(f: ChangedFile, root = repo) {
  return runRules([f], { allSpecFiles: [], repoRoot: root }).filter(
    (x) => x.ruleId === 'team-tag-required'
  );
}

try {
  console.log('team-tag-required: lo que bloquea el workflow Team Tag Validation');

  ok(
    'los tags válidos salen del workflow',
    JSON.stringify(validTeamTags(repo)) === '["@team_admin","@team_enterprise","@team_qa"]'
  );

  const untagged = findings(file('playwright/tests/login/QA-T1.spec.ts', spec("'@login'")));
  ok(
    'un spec nuevo sin tag de equipo es un error bloqueante',
    untagged.length === 1 && untagged[0].severity === 'error' && untagged[0].source === 'ast'
  );
  ok('el hallazgo apunta al describe', untagged[0]?.line === 3);
  ok('el mensaje lista los tags válidos', !!untagged[0]?.message.includes('`@team_enterprise`'));

  ok(
    'un spec nuevo con un tag válido pasa',
    findings(file('playwright/tests/login/QA-T2.spec.ts', spec("'@team_qa'"))).length === 0
  );
  ok(
    'un tag que el workflow no conoce no cuenta',
    findings(file('playwright/tests/login/QA-T3.spec.ts', spec("'@team_payconnect'"))).length === 1
  );

  // The workflow's protected-tag half is a gate only QA passes, and QA does,
  // on purpose: mirroring it would block their own PRs (see the rule).
  ok(
    '@smoke en un spec nuevo no se reporta (lo decide QA, no esta regla)',
    findings(file('playwright/tests/login/QA-T4.spec.ts', spec("'@team_qa', '@smoke'"))).length ===
      0
  );
  ok(
    'quitar @preprod de un spec existente no se reporta (lo decide QA, no esta regla)',
    findings(
      file(
        'playwright/tests/login/QA-T5.spec.ts',
        spec("'@team_qa'"),
        'modified',
        spec("'@team_qa', '@preprod'")
      )
    ).length === 0
  );
  ok(
    'editar un spec existente sin tag de equipo no se reporta (el workflow solo exige el tag a los nuevos)',
    findings(
      file(
        'playwright/tests/login/QA-T6.spec.ts',
        spec("'@login'") + '\n',
        'modified',
        spec("'@login'")
      )
    ).length === 0
  );
  ok(
    'un spec fuera de playwright/tests no está en el alcance del workflow',
    findings(file('playwright/other/QA-T7.spec.ts', spec("'@login'"))).length === 0
  );
  ok(
    'sin el workflow no hay lista y la regla no reporta nada',
    findings(file('playwright/tests/login/QA-T8.spec.ts', spec("'@login'")), noWorkflow).length ===
      0
  );
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(noWorkflow, { recursive: true, force: true });
}

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
