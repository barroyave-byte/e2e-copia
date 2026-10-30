/**
 * Compares each test title in the diff against the test case name held in
 * Zephyr Scale. Zephyr cross-references execution results by title, so a
 * mismatch makes the automated case read as a different one in reporting.
 *
 * Kept out of `rules.ts` because it is the only check that performs network
 * calls: it is asynchronous where the AST rules are pure and synchronous, and
 * it is capped at 'warning' so a Zephyr outage cannot block pull requests.
 */
import * as path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { ChangedFile, DOCS, Finding, TESTCASE_ID_RE, isSpec } from './types';

const project = new Project({
  useInMemoryFileSystem: true,
  skipFileDependencyResolution: true,
  compilerOptions: { allowJs: false, noResolve: true },
});

let seq = 0;

const ZEPHYR_BASE = 'https://api.zephyrscale.smartbear.com/v2/testcases';

function resolveToken(): { token: string; from: string } | null {
  const token = process.env.ZEPHYR_ACCESS_TOKEN;
  return token ? { token, from: 'ZEPHYR_ACCESS_TOKEN' } : null;
}

/** Days until the token expires; negative once expired, and null if the JWT cannot be decoded. */
function daysUntilExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    if (!json.exp) return null;
    return Math.floor((json.exp * 1000 - Date.now()) / 86_400_000);
  } catch {
    return null;
  }
}

interface SpecTitle {
  file: string;
  line: number;
  id: string;
  /** The `test()` title with the leading `@ID` tag removed. */
  title: string;
}

/** Normalises a title for comparison: unifies dashes, collapses whitespace, strips quotes and case. */
function normalize(s: string): string {
  return s
    .replace(/[–—]/g, '-') // guiones largos que Zephyr usa y el código no
    .replace(/\s+/g, ' ')
    .replace(/["'`]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Extracts the test case ID and title of every test whose title line the pull
 * request adds.
 *
 * Parsed from the AST rather than line by line: a third of the declarations in
 * this repository put the title on a different line from `test(`, and modifiers
 * such as `test.only(` are common, both of which a line-based match misses.
 */
export function extractTitles(file: ChangedFile): SpecTitle[] {
  const out: SpecTitle[] = [];
  const sf = project.createSourceFile(
    `/zephyr/${seq++}-${path.basename(file.path)}`,
    file.content,
    { overwrite: true }
  );

  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    // Test declarations and their modifiers, but not `describe` or `step`.
    const callee = call.getExpression().getText();
    if (!/^(test|it)(\.(only|skip|fixme|fail|slow))?$/.test(callee)) continue;

    const arg = call.getArguments()[0];
    if (!arg || (!Node.isStringLiteral(arg) && !Node.isNoSubstitutionTemplateLiteral(arg)))
      continue;

    // Anchored on the title itself, so editing an unrelated line of an existing
    // test does not re-report its title.
    const line = arg.getStartLineNumber();
    if (!file.addedLines.has(line)) continue;

    const full = arg.getLiteralText();
    const idMatch = full.match(TESTCASE_ID_RE);
    if (!idMatch) continue;

    out.push({
      file: file.path,
      line,
      id: idMatch[0].replace('@', ''),
      title: full.replace(idMatch[0], '').trim(),
    });
  }

  return out;
}

/** Sentinela: el token fue rechazado, no tiene sentido seguir preguntando. */
const UNAUTHORIZED = Symbol('unauthorized');

async function fetchZephyrName(
  id: string,
  token: string
): Promise<string | null | typeof UNAUTHORIZED> {
  try {
    const res = await fetch(`${ZEPHYR_BASE}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return UNAUTHORIZED;
    if (!res.ok) return null;
    const body = (await res.json()) as { name?: string };
    return body.name ?? null;
  } catch {
    return null;
  }
}

/** Findings plus whether the API was actually queried. */
export interface ZephyrResult {
  findings: Finding[];
  ran: boolean;
}

export async function runZephyrTitleCheck(files: ChangedFile[]): Promise<ZephyrResult> {
  const resolved = resolveToken();
  if (!resolved) {
    console.log(
      '[pr-review-agent] ZEPHYR_ACCESS_TOKEN missing: skipping the title check (non-blocking).'
    );
    return { findings: [], ran: false };
  }

  const { token, from } = resolved;
  const days = daysUntilExpiry(token);

  // An expired token answers 401 for every request, which would surface as one
  // "not found in Zephyr" warning per test case. Detecting it once keeps the
  // failure in the job log instead of spreading false findings across the diff.
  if (days !== null && days < 0) {
    console.error(
      `[pr-review-agent] ⚠️  The Zephyr token (${from}) EXPIRED ${-days} day(s) ago. ` +
        'The title check stays disabled until it is renewed. This does not block the pull request.'
    );
    return { findings: [], ran: false };
  }
  if (days !== null && days < 15) {
    console.warn(
      `[pr-review-agent] The Zephyr token (${from}) expires in ${days} day(s). It should be renewed.`
    );
  }
  console.log(`[pr-review-agent] Zephyr token resolved from: ${from}`);

  const titles = files.filter((f) => isSpec(f.path)).flatMap(extractTitles);
  if (!titles.length) return { findings: [], ran: true };

  const findings: Finding[] = [];

  for (const t of titles) {
    const zephyrName = await fetchZephyrName(t.id, token);

    if (zephyrName === UNAUTHORIZED) {
      console.error(
        `[pr-review-agent] ⚠️  Zephyr rejected the token (${from}): 401/403. ` +
          'Skipping the title check. This does not block the pull request.'
      );
      return { findings: [], ran: false };
    }

    if (zephyrName === null) {
      findings.push({
        ruleId: 'zephyr-title-match',
        severity: 'warning',
        file: t.file,
        line: t.line,
        title: `No se pudo leer \`${t.id}\` en Zephyr Scale`,
        message:
          'El caso no existe con ese key, o la API no respondió. Verifica que el ID sea el correcto; si el caso no está creado en Zephyr, créalo antes de mergear.',
        docs: DOCS.dsl,
        source: 'ast',
      });
      continue;
    }

    if (normalize(zephyrName) === normalize(t.title)) continue;

    findings.push({
      ruleId: 'zephyr-title-match',
      severity: 'warning',
      file: t.file,
      line: t.line,
      title: 'El título del test no coincide con Zephyr Scale',
      message: [
        '| | Título |',
        '|---|---|',
        `| **Zephyr** | ${zephyrName} |`,
        `| **Código** | ${t.title} |`,
        '',
        'Deben coincidir exactamente: el reporte de Zephyr se cruza por título y una diferencia hace que el caso se lea como distinto. Ajusta el del código, o corrige Zephyr si el título de allá quedó obsoleto.',
      ].join('\n'),
      suggestion: undefined,
      docs: DOCS.dsl,
      source: 'ast',
    });
  }

  return { findings, ran: true };
}
