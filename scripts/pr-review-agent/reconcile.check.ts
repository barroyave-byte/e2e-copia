#!/usr/bin/env ts-node
/**
 * Verification fixture for the thread reconciliation.
 *
 * Exercises the decision table of `reconcileThreads()` against a stubbed
 * Octokit, because that table is what decides whether a reviewer's resolved
 * conversation survives the next push. Run it after touching `github.ts`:
 *
 *   npm run pr-review:check
 */
import { reconcileThreads } from './github';
import { attachIdentity, renderFindingMarker, threadKey } from './identity';
import { ChangedFile, Finding } from './types';

const file: ChangedFile = {
  path: 'playwright/tests/a.spec.ts',
  addedLines: new Set([1, 2, 3, 4, 5]),
  content: [
    '  await page.waitForTimeout(3000);', // L1 · open thread
    '  await page.waitForTimeout(9000);', // L2 · resolved thread  (silenced)
    "  const x = page.locator('//div[1]');", // L3 · outdated, content changed (repost)
    "  test.only('nope', () => {});", // L4 · no thread        (new)
    "  const pwd = 'sk_live_abc123';", // L5 · outdated, content unchanged (leave alone)
  ].join('\n'),
  status: 'modified',
  framework: 'dsl',
};

const mk = (rule: string, line: number): Finding => ({
  ruleId: rule,
  severity: 'error',
  file: file.path,
  line,
  title: rule,
  message: 'x',
  source: 'ast',
});

const findings = attachIdentity(
  [
    mk('no-static-wait', 1),
    mk('no-static-wait', 2),
    mk('fragile-selector', 3),
    mk('no-focused-tests', 4),
    mk('no-hardcoded-secrets', 5),
  ],
  [file]
);

// A finding the previous run reported and this one no longer does.
const goneKey = threadKey(
  'no-networkidle',
  file.path,
  "  await page.waitForLoadState('networkidle');"
);

const body = (key: string, fingerprint: string = key) =>
  `🛑 algo\n\n<sub>\`r\` · regla estática</sub>\n${renderFindingMarker({ r: 'r', s: 'error', o: 'ast', f: fingerprint, t: key })}`;

const threads = [
  {
    id: 'T1',
    isResolved: false,
    isOutdated: false,
    viewerCanResolve: true,
    comments: {
      totalCount: 1,
      nodes: [{ id: 'C1', databaseId: 1, body: body(findings[0].threadKey!) }],
    },
  },
  {
    id: 'T2',
    isResolved: true,
    isOutdated: false,
    viewerCanResolve: true,
    comments: {
      totalCount: 2,
      nodes: [{ id: 'C2', databaseId: 2, body: body(findings[1].threadKey!) }],
    },
  },
  {
    id: 'T3',
    isResolved: false,
    isOutdated: true,
    viewerCanResolve: true,
    comments: {
      // The stored fingerprint is deliberately stale (not findings[2]'s real
      // one) — this thread represents a line whose content genuinely changed
      // since the comment was posted, which is the one case that must still
      // repost.
      totalCount: 1,
      nodes: [
        { id: 'C3', databaseId: 3, body: body(findings[2].threadKey!, 'stale-before-the-edit') },
      ],
    },
  },
  {
    id: 'T4',
    isResolved: false,
    isOutdated: false,
    viewerCanResolve: true,
    comments: { totalCount: 1, nodes: [{ id: 'C4', databaseId: 4, body: body(goneKey) }] },
  },
  {
    id: 'T5',
    isResolved: false,
    isOutdated: false,
    viewerCanResolve: true,
    comments: {
      totalCount: 1,
      nodes: [{ id: 'C5', databaseId: 5, body: '🛑 viejo\n\n<sub>`r` · regla estática</sub>' }],
    },
  },
  {
    id: 'T6',
    isResolved: false,
    isOutdated: false,
    viewerCanResolve: true,
    comments: {
      totalCount: 3,
      nodes: [
        {
          id: 'C6',
          databaseId: 6,
          body: '🛑 viejo con respuestas\n\n<sub>`r` · revisión IA</sub>',
        },
      ],
    },
  },
  {
    id: 'T7',
    isResolved: false,
    isOutdated: false,
    viewerCanResolve: true,
    comments: {
      totalCount: 1,
      nodes: [{ id: 'C7', databaseId: 7, body: 'un humano comentando algo' }],
    },
  },
  {
    id: 'T8',
    isResolved: false,
    isOutdated: true,
    viewerCanResolve: true,
    comments: {
      // Real case from sandbox PR #3612: the pull request's base branch
      // advanced (someone else's PR merged into it) between two runs, and
      // GitHub marked this untouched, unrelated finding's thread outdated
      // anyway. The stored fingerprint matches findings[4]'s exactly — same
      // content, GitHub just lost track of the position — so this must NOT
      // repost.
      totalCount: 1,
      nodes: [
        { id: 'C8', databaseId: 8, body: body(findings[4].threadKey!, findings[4].fingerprint!) },
      ],
    },
  },
];

const resolved: string[] = [];
const minimized: string[] = [];
const deleted: number[] = [];

const octokit: any = {
  graphql: async (query: string, vars: any) => {
    if (query.includes('resolveReviewThread')) {
      resolved.push(vars.id);
      return {};
    }
    if (query.includes('minimizeComment')) {
      minimized.push(vars.id);
      return {};
    }
    return {
      repository: {
        pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false }, nodes: threads } },
      },
    };
  },
  pulls: {
    deleteReviewComment: async ({ comment_id }: any) => {
      deleted.push(comment_id);
    },
  },
};

(async () => {
  const r = await reconcileThreads(
    octokit,
    { owner: 'o', repo: 'r', pull_number: 1, head_sha: 'h' },
    findings
  );
  const ok = (label: string, cond: boolean) => console.log(`${cond ? '✅' : '❌'} ${label}`);

  ok(
    'hallazgo sin hilo → se comenta',
    r.toPost.some((f) => f.line === 4)
  );
  ok('hallazgo con hilo abierto → NO se vuelve a comentar', !r.toPost.some((f) => f.line === 1));
  ok(
    'hallazgo con hilo resuelto → silenciado, no se repite',
    r.silenced.some((f) => f.line === 2) && !r.toPost.some((f) => f.line === 2)
  );
  ok(
    'hilo outdated con contenido REALMENTE distinto → se vuelve a comentar',
    r.toPost.some((f) => f.line === 3)
  );
  ok(
    'hilo outdated con el MISMO contenido (fingerprint igual) → NO se repite',
    !r.toPost.some((f) => f.line === 5) && !r.silenced.some((f) => f.line === 5)
  );
  ok('hilo sin hallazgo vivo → se resuelve solo', resolved.length === 1 && resolved[0] === 'T4');
  ok('comentario viejo sin marcador y sin respuestas → se borra', deleted.includes(5));
  ok('comentario viejo sin marcador con respuestas → se colapsa', minimized.includes('C6'));
  ok(
    'comentario de un humano → intacto',
    !deleted.includes(7) && !minimized.includes('C7') && !resolved.includes('T7')
  );
  console.log(
    `\ntoPost=${r.toPost.length} silenced=${r.silenced.length} ` +
      `autoResolved=${r.autoResolved} legacy=${r.legacyCleared}`
  );

  // The reason thread identity is looser than the metric identity: editing a
  // literal must not close the reviewer's conversation, but it is not a fix
  // either.
  const before = attachIdentity([mk('no-static-wait', 1)], [file])[0];
  const after = attachIdentity(
    [mk('no-static-wait', 1)],
    [{ ...file, content: file.content.replace('3000', '7000') }]
  )[0];
  console.log('');
  ok('editar el timeout conserva el hilo del reviewer', before.threadKey === after.threadKey);
  ok('pero NO cuenta como corregido', before.fingerprint !== after.fingerprint);

  // The LLM invents its own ruleId text on every run — real case observed on
  // PR #3612: the same complaint about the same line came back as
  // `llm/dsl-architecture` in one run and `llm/dsl-orchestration` in the
  // next. If that text leaked into threadKey, every LLM finding would open a
  // brand new thread on every push — the exact bug this file exists to catch,
  // just scoped to the advisory pass instead of the deterministic rules.
  const llmRun1 = attachIdentity([{ ...mk('llm/dsl-architecture', 1), source: 'llm' }], [file])[0];
  const llmRun2 = attachIdentity([{ ...mk('llm/dsl-orchestration', 1), source: 'llm' }], [file])[0];
  console.log('');
  ok(
    'dos ruleId distintos de la IA en la misma línea → mismo hilo',
    llmRun1.threadKey === llmRun2.threadKey
  );
  ok(
    'pero fingerprints distintos (la redacción exacta sí cambió)',
    llmRun1.fingerprint !== llmRun2.fingerprint
  );
})();
