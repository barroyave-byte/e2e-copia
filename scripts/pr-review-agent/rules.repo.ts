/**
 * Rules that need repository-wide context rather than the diffed file alone.
 *
 * They are separated from `rules.ts` because each one shells out to git: they
 * are slower, and their failure modes (git unavailable, empty pathspec) must
 * degrade to zero findings instead of aborting the analysis.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import {
  ChangedFile,
  DOCS,
  Finding,
  Rule,
  TESTCASE_ID_RE,
  isLegacyPageObject,
  isLocatorLayer,
  isSpec,
} from './types';

const project = new Project({
  useInMemoryFileSystem: true,
  skipFileDependencyResolution: true,
  compilerOptions: { allowJs: false, noResolve: true },
});

/**
 * Shared layers that only impacts existing test cases
 */
function isSharedLayer(p: string): boolean {
  return (
    isLegacyPageObject(p) ||
    p.startsWith('playwright/support/interfaces/payment_processors/') ||
    p.startsWith('playwright/support/newman/') ||
    p.startsWith('playwright/support/http/services/') ||
    p.startsWith('playwright/support/api_sup/')
  );
}

let seq = 0;

function parseSource(name: string, content: string) {
  return project.createSourceFile(`/repo/${seq++}-${name}`, content, { overwrite: true });
}

function parse(file: ChangedFile) {
  return parseSource(path.basename(file.path), file.content);
}

/**
 * Tokens a formatter may add or remove without changing behaviour. Comments and
 * JSDoc are documentation, and a semicolon is optional under automatic semicolon
 * insertion.
 */
const COSMETIC_TOKENS = new Set([
  SyntaxKind.JSDoc,
  SyntaxKind.SingleLineCommentTrivia,
  SyntaxKind.MultiLineCommentTrivia,
  SyntaxKind.SemicolonToken,
]);

const CLOSING_TOKENS = new Set([
  SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken,
  SyntaxKind.CloseBraceToken,
]);

/**
 * Reduces a declaration to the token sequence that determines what it does, so
 * two versions can be compared regardless of how they are written.
 *
 * Working from tokens rather than raw text drops everything a formatter controls
 * — indentation, line wrapping, comments, optional semicolons, trailing commas —
 * while keeping every token that carries meaning. A string is compared by its
 * value, so `'a'` and `"a"` match but `'a'` and `'b'` do not.
 *
 * The comparison stays conservative: reordering arguments, dropping an `await`,
 * or changing a number all survive canonicalisation and are still reported.
 */
function canonicalDeclaration(node: Node): string {
  const tokens: Array<{ kind: SyntaxKind; text: string }> = [];

  for (const leaf of node.getDescendants()) {
    if (leaf.getChildCount() !== 0) continue;

    const kind = leaf.getKind();
    if (COSMETIC_TOKENS.has(kind)) continue;

    const text = leaf.getText();
    if (!text) continue;

    tokens.push({
      kind,
      text:
        Node.isStringLiteral(leaf) || Node.isNoSubstitutionTemplateLiteral(leaf)
          ? `str:${leaf.getLiteralText()}`
          : text,
    });
  }

  return tokens
    .filter(
      (token, i) =>
        !(
          token.kind === SyntaxKind.CommaToken &&
          tokens[i + 1] &&
          CLOSING_TOKENS.has(tokens[i + 1].kind)
        )
    )
    .map((token) => token.text)
    .join(' ');
}

/** `git grep -lF` tolerante: devuelve [] ante cualquier fallo (incluido "sin match"). */
function gitGrepFiles(literal: string, pathspecs: string[], repoRoot: string): string[] {
  try {
    return execFileSync('git', ['grep', '-l', '-F', '--', literal, '--', ...pathspecs], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------- duplicate-selector */

const LOCATOR_ARG_API = new Set([
  'locator',
  'getByTestId',
  'getByRole',
  'getByText',
  'getByLabel',
  'getByPlaceholder',
  'getByAltText',
  'getByTitle',
]);

export const ruleDuplicateSelector: Rule = {
  id: 'duplicate-selector',
  severity: 'warning',
  docs: DOCS.dsl,
  appliesTo: (f) => isLocatorLayer(f.path),
  run: (file, ctx) => {
    const findings: Finding[] = [];
    const sf = parse(file);
    const seen = new Set<string>();

    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const line = call.getStartLineNumber();
      if (!file.addedLines.has(line)) continue;

      const expr = call.getExpression();
      const name = Node.isPropertyAccessExpression(expr) ? expr.getName() : expr.getText();
      if (!LOCATOR_ARG_API.has(name)) continue;

      const arg = call.getArguments()[0];
      if (!arg || !Node.isStringLiteral(arg)) continue;

      const selector = arg.getLiteralText();
      // Literales cortos (`div`, `input`) coinciden en todas partes: puro ruido.
      if (selector.length < 12 || seen.has(selector)) continue;

      // A `// migration-or` marker denotes duplication that is intentional and
      // transitional, managed by scripts/collapse-migrated-or.ts.
      const raw = file.content.split('\n')[line - 1] ?? '';
      if (/migration-or/.test(raw)) continue;

      seen.add(selector);

      const others = gitGrepFiles(
        selector,
        ['playwright/pages', 'playwright/framework/plugins'],
        ctx.repoRoot
      ).filter((f) => f !== file.path);

      if (!others.length) continue;

      findings.push({
        ruleId: 'duplicate-selector',
        severity: 'warning',
        file: file.path,
        line,
        title: 'Selector ya declarado en otra capa de locators',
        message: [
          `\`${selector}\` ya existe en:`,
          ...others.slice(0, 5).map((f) => `- \`${f}\``),
          others.length > 5 ? `- _(y ${others.length - 5} más)_` : '',
          '',
          'Cuando el frontend cambie ese atributo habrá que tocarlo en varios lados y alguno se va a quedar atrás. Reutiliza el locator existente, o si de verdad se necesita en varias pages, súbelo a una clase compartida y actualiza los usos.',
        ]
          .filter(Boolean)
          .join('\n'),
        docs: DOCS.dsl,
        source: 'ast',
      });
    }

    return findings;
  },
};

/* ---------------------------------------------------- shared-method-impact */

interface SharedUnit {
  name: string;
  start: number;
  end: number;
  kind: 'método' | 'objeto';
  /** Canonical token sequence, for comparing against the base version. */
  normalized: string;
}

/** Class methods and exported consts: the declarations other test cases depend on. */
function sharedUnits(sf: ReturnType<typeof parseSource>): SharedUnit[] {
  const units: SharedUnit[] = [];

  for (const cls of sf.getClasses()) {
    for (const method of cls.getMethods()) {
      units.push({
        name: method.getName(),
        start: method.getStartLineNumber(),
        end: method.getEndLineNumber(),
        kind: 'método',
        normalized: canonicalDeclaration(method),
      });
    }
  }

  // Payment processor configs and test data are exported as consts, not classes.
  for (const decl of sf.getVariableDeclarations()) {
    if (!decl.isExported()) continue;
    units.push({
      name: decl.getName(),
      start: decl.getStartLineNumber(),
      end: decl.getEndLineNumber(),
      kind: 'objeto',
      normalized: canonicalDeclaration(decl),
    });
  }

  return units;
}

/**
 * Reports which existing test cases call a shared method or use a shared object
 * that this pull request modifies, so their execution evidence can be attached
 * before merging.
 *
 * This is informational rather than a violation: the finding lists the callers
 * found by `git grep`, resolved to test case IDs through their file names.
 */
export const ruleSharedMethodImpact: Rule = {
  id: 'shared-method-impact',
  severity: 'info',
  docs: DOCS.dsl,
  appliesTo: (f) => isSharedLayer(f.path) && f.status === 'modified',
  run: (file, ctx) => {
    const findings: Finding[] = [];
    const units = sharedUnits(parse(file));

    // The same declarations as they stood at the base commit, keyed by name, so
    // a unit can be compared against its own previous version.
    const baseUnits = new Map<string, string>();
    if (file.baseContent) {
      for (const unit of sharedUnits(
        parseSource(`base-${path.basename(file.path)}`, file.baseContent)
      )) {
        baseUnits.set(`${unit.kind}:${unit.name}`, unit.normalized);
      }
    }

    for (const unit of units) {
      {
        const start = unit.start;
        const end = unit.end;

        // Restricted to units whose body contains at least one added line.
        const touched = [...file.addedLines].some((l) => l >= start && l <= end);
        if (!touched) continue;

        // A reformat produces added lines without changing what the unit does.
        // Reporting it costs the author an explanation for a no-op, so the
        // comparison is made against the normalised base version.
        const before = baseUnits.get(`${unit.kind}:${unit.name}`);
        if (before !== undefined && before === unit.normalized) continue;

        const name = unit.name;
        if (!name || name.length < 4) continue;

        // Methods are searched as call sites; exported objects by their name.
        const needle = unit.kind === 'método' ? `.${name}(` : name;
        const callers = gitGrepFiles(needle, ['playwright/tests'], ctx.repoRoot);
        const ids = [
          ...new Set(
            callers
              .map((f) => path.basename(f, '.spec.ts'))
              .filter((b) => TESTCASE_ID_RE.test(`@${b}`))
          ),
        ].sort();

        // A single caller carries no cross-test regression risk worth reporting.
        if (ids.length < 2) continue;

        findings.push({
          ruleId: 'shared-method-impact',
          severity: 'info',
          file: file.path,
          line: start,
          title: `\`${name}\` lo usan ${ids.length} test cases`,
          message: [
            `Modificaste un ${unit.kind} compartido. Estos casos de prueba lo usan y podrían verse afectados:`,
            '',
            ids
              .slice(0, 25)
              .map((id) => `\`${id}\``)
              .join(' · '),
            ids.length > 25 ? `\n_(y ${ids.length - 25} más)_` : '',
            '',
            'Adjunta evidencia de ejecución de los que aplique, o explica en el PR por qué el cambio es retrocompatible.',
          ]
            .filter(Boolean)
            .join('\n'),
          docs: DOCS.dsl,
          source: 'ast',
        });
      }
    }

    return findings;
  },
};

/* --------------------------------------------------------- duplicate-function */

/** Splits a method name into meaningful tokens, so names are compared by wording rather than exact text. */
function nameTokens(name: string): Set<string> {
  const NOISE = new Set(['on', 'the', 'a', 'to', 'from', 'and', 'get', 'do']);
  return new Set(
    name
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !NOISE.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Lazily built index of every method declared across the locator layers. */
let methodIndex: Array<{ file: string; name: string; tokens: Set<string> }> | null = null;

function buildMethodIndex(repoRoot: string) {
  if (methodIndex) return methodIndex;
  methodIndex = [];

  let files: string[] = [];
  try {
    files = execFileSync(
      'git',
      [
        'ls-files',
        'playwright/pages/*.ts',
        'playwright/pages/**/*.ts',
        'playwright/framework/plugins/**/*.ts',
      ],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    return methodIndex;
  }

  // Regex rather than a full AST parse: this scans roughly a thousand files and
  // only the declared names are needed.
  const declRe =
    /^\s{2}(?:public |private |protected )?(?:async\s+)?([a-z][A-Za-z0-9_]{3,})\s*\(/gm;

  for (const f of files) {
    let src = '';
    try {
      src = require('fs').readFileSync(`${repoRoot}/${f}`, 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(declRe)) {
      const name = m[1];
      if (name === 'constructor' || /^(if|for|while|switch|catch|return)$/.test(name)) continue;
      methodIndex.push({ file: f, name, tokens: nameTokens(name) });
    }
  }

  return methodIndex;
}

/** A new method and the existing methods whose names resemble it, handed to the LLM pass to judge. */
export interface DuplicateCandidate {
  file: string;
  line: number;
  newMethod: string;
  matches: Array<{ file: string; name: string; score: number }>;
}

const duplicateCandidates: DuplicateCandidate[] = [];

export function takeDuplicateCandidates(): DuplicateCandidate[] {
  return duplicateCandidates.splice(0, duplicateCandidates.length);
}

/**
 * Detects a newly declared method that duplicates one already present in
 * another locator layer, which leads to the same behaviour being fixed in one
 * place and left stale in the other.
 *
 * Only an identical name in another file is reported. Names that merely
 * resemble an existing one (Jaccard similarity of 0.6 or above) are collected
 * as candidates and passed to the LLM pass, which decides whether the two are
 * genuinely the same behaviour; the AST cannot make that call on its own.
 */
export const ruleDuplicateFunction: Rule = {
  id: 'duplicate-function',
  severity: 'warning',
  docs: DOCS.dsl,
  appliesTo: (f) => isLocatorLayer(f.path),
  run: (file, ctx) => {
    const findings: Finding[] = [];
    const sf = parse(file);
    const index = buildMethodIndex(ctx.repoRoot);

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const line = method.getStartLineNumber();
        // Restricted to new methods: the signature itself must be an added line.
        if (!file.addedLines.has(line)) continue;

        const name = method.getName();
        if (!name || name.length < 5) continue;

        const tokens = nameTokens(name);
        const others = index.filter((e) => e.file !== file.path);

        const exact = others.filter((e) => e.name === name);

        // A name declared across many files is a repository convention or an
        // interface method every plugin implements, not accidental duplication.
        // Accidental duplication clusters in a handful of files, so anything
        // declared in more than six, or in the plugin interface, is skipped.
        const isRepoConvention =
          exact.length > 6 || exact.some((e) => e.file.endsWith('framework/plugins/interface.ts'));
        if (isRepoConvention) continue;
        const similar = others
          .filter((e) => e.name !== name && jaccard(tokens, e.tokens) >= 0.6)
          .map((e) => ({ file: e.file, name: e.name, score: jaccard(tokens, e.tokens) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);

        if (exact.length) {
          findings.push({
            ruleId: 'duplicate-function',
            severity: 'warning',
            file: file.path,
            line,
            title: `Ya existe un método \`${name}()\``,
            message: [
              `\`${name}()\` está declarado también en:`,
              ...exact.slice(0, 4).map((e) => `- \`${e.file}\``),
              '',
              'Si hace lo mismo, reutiliza el existente o extiende su clase. Si de verdad son comportamientos distintos, dale un nombre que los diferencie — dos métodos con el mismo nombre en dos pages es la vía rápida a arreglar el bug en uno y no en el otro.',
            ].join('\n'),
            docs: DOCS.dsl,
            source: 'ast',
          });
        }

        if (similar.length) {
          duplicateCandidates.push({ file: file.path, line, newMethod: name, matches: similar });
        }
      }
    }

    return findings;
  },
};

/**
 * The team-tag half of the Team Tag Validation workflow, as a reviewer rule:
 * a new spec must carry the tag of the team that owns it.
 *
 * The workflow already blocks the pull request, but only once it is open, and
 * nothing that reviews a change before that — this reviewer run with
 * `--worktree`, and qa-testgen's codegen agent through it — could see the
 * rule: it lived in a shell script. PR #3892 failed it on all nine of its new
 * specs with a clean pre-check.
 *
 * The valid tags are read from the workflow itself, never copied here, so the
 * two cannot drift: a team added there is valid here on the next run. If the
 * workflow or its `VALID_TAGS` line is gone the rule reports nothing, since
 * there is no list to hold a spec to. Matching is the workflow's own: a plain
 * substring search over the whole file (`grep -q`), and only for added files
 * under `playwright/tests/` (`--diff-filter=A`).
 *
 * The workflow's other half — no `@preprod`/`@smoke` on a new spec, none
 * removed from an existing one — is deliberately NOT mirrored. It is a gate
 * only the QA team passes ("only QA team", in its own message), and they do,
 * on purpose: the false-positive sweep over the last 60 spec commits on
 * develop found 83 such changes, every one a deliberate move (`@preprod` ->
 * `@fixme_preprod`, release syncs, consolidated cases). As a blocking finding
 * here it would block the QA team's own pull requests.
 */
export const TEAM_TAG_WORKFLOW = '.github/workflows/team-tag-validation.yml';

const validTagsCache = new Map<string, string[] | null>();

/** The `VALID_TAGS` list of the workflow, or null when it cannot be read. */
export function validTeamTags(repoRoot: string): string[] | null {
  if (validTagsCache.has(repoRoot)) return validTagsCache.get(repoRoot)!;
  let tags: string[] | null = null;
  try {
    const workflow = fs.readFileSync(path.join(repoRoot, TEAM_TAG_WORKFLOW), 'utf8');
    const m = workflow.match(/VALID_TAGS="([^"]+)"/);
    tags = m ? m[1].split(/\s+/).filter(Boolean) : null;
  } catch {
    tags = null;
  }
  if (!tags)
    console.error(
      `[pr-review-agent] team-tag-required: no VALID_TAGS in ${TEAM_TAG_WORKFLOW}; rule skipped`
    );
  validTagsCache.set(repoRoot, tags);
  return tags;
}

/** The line the tag belongs on: the first `describe`, else the first test. */
function tagLine(file: ChangedFile): number {
  const lines = file.content.split('\n');
  for (const re of [/\btest\.describe(\.\w+)?\s*\(/, /\btest(\.\w+)?\s*\(/]) {
    const i = lines.findIndex((l) => re.test(l));
    if (i >= 0) return i + 1;
  }
  return 1;
}

const ruleTeamTagRequired: Rule = {
  id: 'team-tag-required',
  severity: 'error',
  docs: DOCS.tags,
  appliesTo: (f) =>
    isSpec(f.path) && f.path.startsWith('playwright/tests/') && f.status === 'added',
  run: (file, ctx) => {
    const valid = validTeamTags(ctx.repoRoot);
    if (!valid || valid.some((tag) => file.content.includes(tag))) return [];
    return [
      {
        ruleId: 'team-tag-required',
        severity: 'error',
        file: file.path,
        line: tagLine(file),
        title: 'Falta el tag del equipo dueño del spec',
        message: [
          'Todo spec nuevo debe llevar el tag del equipo que lo mantiene; sin él, el check *Team Tag Validation* falla y bloquea el PR.',
          '',
          `Agrega uno de estos tags en \`{ tag: [...] }\` del test o del \`describe\`: ${valid.map((t) => `\`${t}\``).join(' ')}.`,
          '',
          `_La lista sale de \`${TEAM_TAG_WORKFLOW}\`, la misma que valida CI._`,
        ].join('\n'),
        docs: DOCS.tags,
        source: 'ast',
      },
    ];
  },
};

export const REPO_RULES: Rule[] = [
  ruleDuplicateSelector,
  ruleSharedMethodImpact,
  ruleDuplicateFunction,
  ruleTeamTagRequired,
];
