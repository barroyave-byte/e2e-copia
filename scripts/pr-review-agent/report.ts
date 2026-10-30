import { ChangedFile, Finding, Severity } from './types';
import { renderFindingMarker } from './identity';

/** Hidden marker used to find and update the agent's existing summary comment on later pushes. */
export const COMMENT_MARKER = '<!-- deuna-pr-reviewer-agent -->';

const ICON: Record<Severity, string> = {
  error: '🛑',
  warning: '⚠️',
  info: '💡',
};

/**
 * Human-readable state of the advisory pass. Reported verbatim so a silent API
 * failure is never presented as a completed AI review.
 */
const LLM_STATE_LABEL: Record<string, string> = {
  ok: 'ejecutada (solo sugerencias, nunca bloquea)',
  failed: '⚠️ falló al llamar a la API — este PR no recibió revisión IA',
  'no-key': 'desactivada (sin OPENAI_API_KEY ni ANTHROPIC_API_KEY)',
  'nothing-to-review': 'sin archivos que revisar',
  off: 'desactivada por configuración',
  skipped: 'omitida',
};

const LABEL: Record<Severity, string> = {
  error: 'Bloqueante',
  warning: 'Advertencia',
  info: 'Sugerencia',
};

export function countBy(findings: Finding[], severity: Severity): number {
  return findings.filter((f) => f.severity === severity).length;
}

/** True when the run should fail the check: only deterministic AST errors block. */
export function isBlocking(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === 'error' && f.source === 'ast');
}

/* ------------------------------------------------------- inline comment */

export function renderInlineComment(f: Finding): string {
  const parts = [`${ICON[f.severity]} **${LABEL[f.severity]} · ${f.title}**`, '', f.message];

  if (f.suggestion !== undefined) {
    parts.push(
      '',
      f.source === 'llm'
        ? '_Sugerencia generada por IA — revísala antes de aplicarla._'
        : '_Aplica el cambio con **Commit suggestion**._',
      '```suggestion',
      f.suggestion,
      '```'
    );
  }

  const meta = [`\`${f.ruleId}\``, f.source === 'llm' ? 'revisión IA' : 'regla estática'];
  if (f.docs) meta.push(`[docs](${docsLink(f.docs)})`);
  parts.push('', `<sub>${meta.join(' · ')}</sub>`);

  // Feedback line and machine-readable marker. The 👍/👎 convention is stated on
  // every comment because a reaction nobody knows to leave measures nothing, and
  // the marker is what lets the weekly report attribute that reaction to a rule
  // without parsing this Spanish prose.
  parts.push(
    '',
    '<sub>¿Te sirvió? Reacciona 👍 · ¿Falso positivo? Reacciona 👎 o responde `falso positivo` — alimenta el reporte semanal de QA.</sub>'
  );
  parts.push(
    renderFindingMarker({
      r: f.ruleId,
      s: f.severity,
      o: f.source,
      f: f.fingerprint ?? '',
      t: f.threadKey,
      pr: Number(process.env.PR_NUMBER ?? 0) || undefined,
      run: process.env.GITHUB_RUN_ID,
    })
  );

  return parts.join('\n');
}

function docsLink(docs: string): string {
  if (docs.startsWith('http')) return docs;
  const clean = docs.replace(/\s*\(.*\)$/, '');
  return `https://github.com/DUNA-E-Commmerce/e2e-testing/blob/develop/${clean}`;
}

/* ---------------------------------------------------- pull request summary */

export function renderSummary(
  findings: Finding[],
  files: ChangedFile[],
  opts: {
    llmState: 'ok' | 'failed' | 'no-key' | 'nothing-to-review' | 'off' | 'skipped';
    zephyrRan: boolean;
    runUrl?: string;
    /** Comments opened by *this* push. The rest already have a live thread. */
    postedInline: number;
    published: boolean;
    llmProvider?: string;
    /** Findings whose thread a reviewer resolved: silenced, never repeated inline. */
    silenced?: Finding[];
    /** Threads the agent closed because the finding is gone. */
    autoResolved?: number;
  }
): string {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const infos = findings.filter((f) => f.severity === 'info');
  const blocking = isBlocking(findings);

  const dsl = files.filter((f) => f.framework === 'dsl').length;
  const legacy = files.filter((f) => f.framework === 'legacy').length;
  const addedLines = files.reduce((n, f) => n + f.addedLines.size, 0);

  const out: string[] = [COMMENT_MARKER, ''];

  out.push(
    blocking
      ? '## ❌ Code Review Automatizado — cambios requeridos'
      : warnings.length || infos.length
        ? '## ✅ Code Review Automatizado — aprobado con observaciones'
        : '## ✅ Code Review Automatizado — sin hallazgos'
  );
  out.push('');

  out.push(
    blocking
      ? `Encontré **${errors.length} hallazgo(s) bloqueante(s)** contra el estándar de pruebas. Corrígelos y el agente se vuelve a ejecutar en el próximo push.`
      : errors.length || warnings.length || infos.length
        ? 'Ningún hallazgo bloqueante. Las observaciones de abajo son recomendaciones: el QA Lead decide si aplican.'
        : 'Los cambios cumplen el estándar de pruebas auditado automáticamente.'
  );
  out.push('');

  // Result table, one row per rule category.
  out.push('| | Categoría | Hallazgos |');
  out.push('|---|---|---|');
  out.push(
    row('Test Case ID y Zephyr', findings, [
      'testcase-id',
      'no-testcase-id-in-describe',
      'zephyr-title-match',
    ])
  );
  out.push(
    row('Arquitectura de locators (DSL / POM)', findings, [
      'no-locators-in-spec',
      'no-raw-interaction-in-spec',
      'locators-in-constructor',
      'fragile-selector',
      'duplicate-selector',
      'duplicate-function',
      'prefer-testid',
    ])
  );
  out.push(
    row('Esperas y sincronización', findings, [
      'no-static-wait',
      'no-networkidle',
      'no-adhoc-retry',
      'no-swallowed-error',
    ])
  );
  out.push(
    row('Credenciales y race conditions', findings, [
      'no-hardcoded-secrets',
      'no-saveconfig-credentials',
    ])
  );
  out.push(
    row('Limpieza (`.only`, código comentado, APIs deprecadas)', findings, [
      'no-focused-tests',
      'no-commented-out-code',
      'no-deprecated-type',
    ])
  );
  out.push(
    row('Validaciones reales', findings, ['test-without-assertion', 'assert-without-expect'])
  );
  out.push(row('Convenciones del repo', findings, ['wrong-test-import', 'spanish-message']));
  out.push(row('Impacto en test cases existentes', findings, ['shared-method-impact']));
  out.push(
    row('Gobierno de la migración a DSL', findings, ['new-spec-framework', 'mixed-framework'])
  );
  if (opts.llmState === 'ok') {
    out.push(row('Patrones de flakiness (revisión IA)', findings, ['llm/']));
  }
  out.push('');

  // Full finding list, grouped by file.
  if (findings.length) {
    out.push('<details>');
    out.push(`<summary><b>Detalle de ${findings.length} hallazgo(s)</b></summary>`);
    out.push('');

    for (const [file, group] of groupByFile(findings)) {
      out.push(`#### \`${file}\``);
      out.push('');
      for (const f of group.sort((a, b) => a.line - b.line)) {
        out.push(`- ${ICON[f.severity]} **L${f.line}** — ${f.title} <sub>\`${f.ruleId}\`</sub>`);
      }
      out.push('');
    }
    out.push('</details>');
    out.push('');
  }

  // Silenced findings need a visible home. Resolving a thread hides the comment
  // but does not lift the check, so a blocking finding that nobody can see is
  // exactly the situation that makes a red check look like an agent bug.
  const silenced = opts.silenced ?? [];
  if (silenced.length) {
    out.push(`#### 🔇 ${silenced.length} hallazgo(s) silenciado(s)`);
    out.push('');
    out.push(
      'Un reviewer resolvió su hilo, así que el agente ya no los repite inline. ' +
        '**Resolver un hilo no levanta el check:** si alguno es bloqueante, lo sigue siendo hasta que el código cambie.'
    );
    out.push('');
    for (const f of silenced.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
      out.push(
        `- ${ICON[f.severity]} \`${f.file}\` **L${f.line}** — ${f.title} <sub>\`${f.ruleId}\`</sub>`
      );
    }
    out.push('');
  }

  // Scope disclosure, so a passing check is not read as a full review.
  out.push('<details>');
  out.push('<summary>Alcance de esta revisión</summary>');
  out.push('');
  out.push(
    `- **Archivos auditados:** ${files.length} (${dsl} DSL · ${legacy} legacy/POM · ${files.length - dsl - legacy} sin framework detectado)`
  );
  out.push(
    `- **Líneas evaluadas:** ${addedLines} líneas **añadidas**. El agente no reporta código preexistente que no toques — la suite arrastra violaciones legacy conocidas.`
  );
  if (opts.published) {
    // One thread per finding, kept alive across pushes: a finding that already
    // has an open conversation is not commented again.
    const alreadyOpen = Math.max(0, findings.length - opts.postedInline - silenced.length);
    const parts = [`${opts.postedInline} nuevo(s) en este push`];
    if (alreadyOpen) parts.push(`${alreadyOpen} ya con hilo abierto`);
    if (silenced.length) parts.push(`${silenced.length} silenciado(s) por un reviewer`);
    if (opts.autoResolved) parts.push(`${opts.autoResolved} resuelto(s) al corregirse`);

    out.push(`- **Comentarios inline:** ${parts.join(' · ')}.`);
    out.push(
      '- **Hilos:** el agente ya no borra ni republica sus comentarios. Un hallazgo conserva su hilo mientras exista, y el agente lo resuelve solo cuando el código deja de violarlo.'
    );
  }
  out.push(
    `- **Revisión IA:** ${LLM_STATE_LABEL[opts.llmState]}${
      opts.llmState === 'ok' && opts.llmProvider ? ` · modelo: \`${opts.llmProvider}\`` : ''
    }`
  );
  out.push(
    `- **Títulos contra Zephyr Scale:** ${opts.zephyrRan ? 'comparados' : 'no verificados (token ausente o expirado)'}`
  );
  out.push(
    '- **No auditado:** correctitud funcional del caso de prueba, cobertura, y si el test realmente valida el criterio de aceptación de Jira. Eso sigue siendo revisión humana.'
  );
  out.push('');
  out.push('</details>');
  out.push('');

  out.push('---');
  out.push(
    `<sub>🤖 DEUNA PR Reviewer Agent · reglas en \`scripts/pr-review-agent/rules.ts\`${opts.runUrl ? ` · [ver ejecución](${opts.runUrl})` : ''} · ¿falso positivo? abre un PR sobre la regla o etiqueta al owner de QA Automation.</sub>`
  );

  return out.join('\n');
}

function row(label: string, findings: Finding[], ruleIds: string[]): string {
  const matched = findings.filter((f) => ruleIds.some((id) => f.ruleId.startsWith(id)));
  const errs = countBy(matched, 'error');
  const warns = countBy(matched, 'warning');
  const infos = countBy(matched, 'info');

  const icon = errs ? '🛑' : warns ? '⚠️' : infos ? '💡' : '✅';
  const detail = matched.length
    ? [
        errs && `${errs} bloqueante(s)`,
        warns && `${warns} advertencia(s)`,
        infos && `${infos} sugerencia(s)`,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Sin hallazgos';

  return `| ${icon} | ${label} | ${detail} |`;
}

function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = map.get(f.file) ?? [];
    list.push(f);
    map.set(f.file, list);
  }
  return map;
}

/** Plain-text rendering for CI logs and local dry runs, where no pull request exists. */
export function renderConsole(findings: Finding[]): string {
  if (!findings.length) return '✅ Sin hallazgos.';
  return findings
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
    .map((f) => `${ICON[f.severity]} ${f.file}:${f.line}  [${f.ruleId}] ${f.title}`)
    .join('\n');
}

/* ------------------------------------------------------------- --json */

/**
 * Version of the `--json` document. Bump it on any change a consumer could
 * trip over — a renamed or removed field, a changed meaning — and never for an
 * added field. qa-testgen's codegen reads this document to make its agent fix
 * what this reviewer would report, and refuses a version it does not know
 * rather than misreading it.
 */
export const JSON_REPORT_SCHEMA = 1;

export interface JsonReport {
  schema: typeof JSON_REPORT_SCHEMA;
  base: string;
  /** A commit, or `null` for the working tree (`--worktree`). */
  head: string | null;
  /** Same rule as the exit code: an `error` from a deterministic rule. */
  blocking: boolean;
  counts: Record<Severity, number>;
  files: { path: string; framework: string; status: string; addedLines: number }[];
  passes: { zephyr: 'ran' | 'skipped'; llm: string };
  findings: Omit<Finding, 'suggestionSpan'>[];
}

/**
 * The run as a machine-readable document, for a caller that acts on the
 * findings instead of reading them. Carries the finding as it would be
 * published — Spanish `title`/`message` included — plus its `fingerprint`, so
 * a consumer can tell the same finding across two runs.
 */
export function renderJson(
  findings: Finding[],
  files: ChangedFile[],
  meta: { base: string; head: string | null; zephyrRan: boolean; llmState: string }
): JsonReport {
  const sorted = [...findings].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return {
    schema: JSON_REPORT_SCHEMA,
    base: meta.base,
    head: meta.head,
    blocking: isBlocking(findings),
    counts: {
      error: countBy(findings, 'error'),
      warning: countBy(findings, 'warning'),
      info: countBy(findings, 'info'),
    },
    files: files.map((f) => ({
      path: f.path,
      framework: f.framework,
      status: f.status,
      addedLines: f.addedLines.size,
    })),
    passes: { zephyr: meta.zephyrRan ? 'ran' : 'skipped', llm: meta.llmState },
    findings: sorted.map(({ suggestionSpan: _span, ...rest }) => rest),
  };
}
