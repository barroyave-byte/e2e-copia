/**
 * Rules covering test correctness and repository conventions: whether a test
 * actually validates anything, whether errors are allowed to surface, and
 * whether imports and report messages follow the agreed standard.
 */
import { Node, Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import { ChangedFile, DOCS, Finding, Rule, isLocatorLayer, isSpec } from './types';

const project = new Project({
  useInMemoryFileSystem: true,
  skipFileDependencyResolution: true,
  compilerOptions: { allowJs: false, noResolve: true },
});

let seq = 0;

function parse(file: ChangedFile): SourceFile {
  return project.createSourceFile(`/review/${seq++}-${path.basename(file.path)}`, file.content, {
    overwrite: true,
  });
}

/**
 * Matches any construct that can fail a test, covering the four forms used
 * across this repository:
 *  - A Playwright `expect(...)`.
 *  - A call to an `assert*` / `verify*` / `validate*` method.
 *  - An `ensure*(...)` helper or `locator.waitFor({ state })`, both of which
 *    throw when unsatisfied and therefore stop the test like an assertion.
 *  - A DSL action step, where the assertion is data rather than code:
 *    `action: 'api.payment.assertPurchaseStatus'` with `expectedStatus: 200`.
 */
const ASSERTION_SIGNAL =
  /expect\s*\(|\.(assert|verify|validate|expect)[A-Z][A-Za-z0-9_]*\s*\(|\bensure[A-Z][A-Za-z0-9_]*\s*\(|\.waitFor\s*\(|toBeVisible|toHaveText|toHaveURL|action:\s*['"`][^'"`]*(assert|verify|validate)|expected[A-Z]/i;

/* --------------------------------------------------- tests without assertions */

/**
 * Detects a test that contains no assertion of any form, and therefore always
 * reports green: it runs its steps and finishes without checking any outcome.
 *
 * Scoped to tests whose declaration line is newly added. Applying it to every
 * test in a modified file would flag pre-existing tests for edits unrelated to
 * their assertions.
 */
const ruleTestWithoutAssertion: Rule = {
  id: 'test-without-assertion',
  severity: 'error',
  docs: DOCS.dsl,
  appliesTo: (f) => isSpec(f.path),
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);

    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const line = call.getStartLineNumber();
      if (!file.addedLines.has(line)) continue;

      // Matches a test declaration and its modifiers (`test.only`, `test.skip`,
      // `test.fixme`), while excluding `test.describe` and `test.step`, which
      // are containers rather than test cases.
      const callee = call.getExpression().getText();
      if (!/^(test|it)(\.(only|skip|fixme|fail|slow))?$/.test(callee)) continue;

      const body = call
        .getArguments()
        .find((a) => Node.isArrowFunction(a) || Node.isFunctionExpression(a));
      if (!body) continue;
      if (ASSERTION_SIGNAL.test(body.getText())) continue;

      findings.push({
        ruleId: 'test-without-assertion',
        severity: 'error',
        file: file.path,
        line,
        title: 'El test no valida nada',
        message: [
          'No encuentro en este test ningún `expect(...)` ni llamada a un método `assert*` / `verify*` / `validate*`. Tal como está, **pasa siempre**: ejecuta pasos y termina en verde sin comprobar el resultado.',
          '',
          'Agrega la validación del criterio de aceptación del caso de prueba. Si la aserción vive en una Page Class, llámala desde aquí; un `console.log` no es una validación.',
        ].join('\n'),
        docs: DOCS.dsl,
        source: 'ast',
      });
    }

    return findings;
  },
};

/* ----------------------------------------------------- assert sin expect */

/**
 * Detects a method named `assert*` / `verify*` / `validate*` whose body cannot
 * fail, so callers believe they are validating something when they are not.
 *
 * Delegating to `ensureVisible()` or to another assertion counts as asserting,
 * which is why the check tests for any construct in ASSERTION_SIGNAL rather
 * than for `expect` alone.
 */
const ruleAssertWithoutExpect: Rule = {
  id: 'assert-without-expect',
  severity: 'warning',
  docs: DOCS.dsl,
  appliesTo: (f) => isLocatorLayer(f.path),
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const name = method.getName();
        if (!/^(assert|verify|validate|expect)[A-Z]/.test(name)) continue;

        const start = method.getStartLineNumber();
        const end = method.getEndLineNumber();
        if (![...file.addedLines].some((l) => l >= start && l <= end)) continue;

        const body = method.getBody()?.getText() ?? '';
        if (ASSERTION_SIGNAL.test(body)) continue;

        findings.push({
          ruleId: 'assert-without-expect',
          severity: 'warning',
          file: file.path,
          line: start,
          title: `\`${name}()\` se llama assert pero no asevera`,
          message: [
            `El nombre promete una validación, pero el cuerpo no tiene \`expect(...)\` ni delega en otro assert (\`ensureVisible\`, \`assert*\`).`,
            '',
            'Quien lo llame desde un test va a creer que está validando algo. Agrega el `expect` con su mensaje, o renombra el método a lo que realmente hace (`clickX`, `fillY`).',
          ].join('\n'),
          docs: DOCS.dsl,
          source: 'ast',
        });
      }
    }

    return findings;
  },
};

/* ------------------------------------------------------- error silenciado */

/**
 * Detects a `catch` that discards the error around Playwright work, which lets
 * a test pass even when the interaction or assertion inside the `try` failed.
 *
 * Three shapes are treated as correct and skipped: re-throwing, returning a
 * boolean (the semantics of a predicate helper), and failing explicitly through
 * `expect`. Blocks that wrap no Playwright work, such as a `JSON.parse` guard,
 * are control flow rather than a suppressed test failure.
 */
const ruleNoSwallowedError: Rule = {
  id: 'no-swallowed-error',
  severity: 'error',
  docs: DOCS.flaky,
  appliesTo: () => true,
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);

    for (const clause of sf.getDescendantsOfKind(SyntaxKind.CatchClause)) {
      const line = clause.getStartLineNumber();
      if (!file.addedLines.has(line)) continue;

      const body = clause.getBlock().getText();
      const tryBlock =
        clause.getParent()?.asKind(SyntaxKind.TryStatement)?.getTryBlock()?.getText() ?? '';

      // Only blocks wrapping browser interactions or assertions can suppress a
      // test failure. A parsing guard has no test outcome to hide.
      const wrapsPlaywrightWork =
        /\b(page|locator|frame|iframe)\b|expect\s*\(|\.(click|fill|type|press|check|hover|goto|waitFor[A-Z]\w*)\s*\(/.test(
          tryBlock
        );
      if (!wrapsPlaywrightWork) continue;

      // Re-lanza: correcto.
      if (/\bthrow\b/.test(body)) continue;
      // Returning a boolean is the intended semantics of a predicate helper.
      if (/return\s+(true|false)\s*;?/.test(body)) continue;
      // Failing explicitly through `expect` keeps the failure visible.
      if (/expect\s*\(/.test(body)) continue;

      findings.push({
        ruleId: 'no-swallowed-error',
        severity: 'error',
        file: file.path,
        line,
        title: '`catch` que silencia el error',
        message: [
          'Este `catch` no re-lanza, no devuelve un booleano y no falla con `expect`: si el bloque revienta, el test **sigue y pasa en verde**. Es el fallo más caro en una suite E2E, porque oculta el bug en vez de reportarlo.',
          '',
          'Opciones válidas:',
          '- Quitar el `try/catch` y dejar que Playwright falle con su propio mensaje.',
          '- Usar `await expect(locator).toBeVisible()` en lugar de atrapar el error — ya toma el timeout por defecto de `playwright.config.ts`.',
          "- Si de verdad quieres tolerar un caso concreto: filtra por tipo (`if (err.name !== 'TimeoutError') throw err;`) y re-lanza el resto.",
        ].join('\n'),
        docs: `${DOCS.flaky} (regla 2)`,
        source: 'ast',
      });
    }

    return findings;
  },
};

/* --------------------------------------------------------- import correcto */

/**
 * Detects `test` or `expect` imported straight from `@playwright/test` in a
 * spec file. The repository's fixtures grant browser permissions, install the
 * global request mocks and wire the service layer, none of which a test
 * receives when it bypasses `@support/fixtures`, which re-exports both.
 */
const ruleWrongTestImport: Rule = {
  id: 'wrong-test-import',
  severity: 'error',
  docs: DOCS.dsl,
  appliesTo: (f) => isSpec(f.path),
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);

    for (const decl of sf.getImportDeclarations()) {
      const line = decl.getStartLineNumber();
      if (!file.addedLines.has(line)) continue;
      if (decl.getModuleSpecifierValue() !== '@playwright/test') continue;

      const named = decl.getNamedImports().map((n) => n.getName());
      const offending = named.filter((n) => n === 'test' || n === 'expect');
      if (!offending.length) continue;

      // A one-click swap is only offered when every imported name is re-exported
      // by @support/fixtures; otherwise the imports have to be split by hand.
      const onlyFixtureExports = named.every((n) => n === 'test' || n === 'expect');

      findings.push({
        ruleId: 'wrong-test-import',
        severity: 'error',
        file: file.path,
        line,
        title: `\`${offending.join('` y `')}\` importado de \`@playwright/test\``,
        message: [
          'Los fixtures del repo (`@support/fixtures`) otorgan permisos del navegador, inyectan los mocks de request y montan los services. Importando directo de `@playwright/test` el test corre **sin nada de eso** y falla de formas difíciles de diagnosticar.',
          '',
          onlyFixtureExports
            ? '`@support/fixtures` re-exporta `test` y `expect`, así que basta cambiar el módulo.'
            : 'Separa los imports: `test`/`expect` desde `@support/fixtures`, y los tipos desde `@playwright/test`.',
        ].join('\n'),
        suggestion: onlyFixtureExports
          ? (file.content.split('\n')[line - 1] ?? '').replace(
              '@playwright/test',
              '@support/fixtures'
            )
          : undefined,
        docs: DOCS.dsl,
        source: 'ast',
      });
    }

    return findings;
  },
};

/* ------------------------------------------------------- message language */

const SPANISH_DIACRITICS = /[áéíóúñ¡¿]/i;
const SPANISH_STOPWORDS =
  /\b(que|para|desde|debe|deberia|debería|con|los|las|una|unos|unas|del|por|como|este|esta|estos|cuando|porque|pero|sin|más|mas|hasta|aqui|aquí|entonces|tambien|también)\b/i;

function looksSpanish(text: string): boolean {
  if (text.length < 12) return false;
  return SPANISH_DIACRITICS.test(text) || SPANISH_STOPWORDS.test(text);
}

/**
 * Detects Spanish text in code comments and in the messages that reach the
 * execution report: `expect` messages, `throw new Error` arguments, `console.*`
 * output and step titles.
 *
 * Locator strings are deliberately out of scope. Spanish is correct there,
 * because those strings match Spanish application UI.
 */
const ruleSpanishMessage: Rule = {
  id: 'spanish-message',
  severity: 'info',
  docs: DOCS.dsl,
  appliesTo: () => true,
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);
    const reported = new Set<number>();

    const report = (line: number, what: string, text: string) => {
      if (reported.has(line) || !file.addedLines.has(line)) return;
      reported.add(line);
      findings.push({
        ruleId: 'spanish-message',
        severity: 'info',
        file: file.path,
        line,
        title: `${what} en español`,
        message: [
          `\`${text.slice(0, 90)}${text.length > 90 ? '…' : ''}\``,
          '',
          'El acuerdo del equipo es mantener en inglés lo que se lee en el reporte y en el código. Los textos de **locators** quedan fuera: ahí el español es lo correcto porque apuntan a la UI.',
        ].join('\n'),
        docs: DOCS.dsl,
        source: 'ast',
      });
    };

    // Messages that surface in the execution report.
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression().getText();
      const isMessageCall =
        /^expect$/.test(callee) ||
        /^console\.\w+$/.test(callee) ||
        /^test\.(step|info)$/.test(callee);
      if (!isMessageCall) continue;

      for (const arg of call.getArguments()) {
        if (!Node.isStringLiteral(arg) && !Node.isNoSubstitutionTemplateLiteral(arg)) continue;
        const text = arg.getLiteralText();
        if (looksSpanish(text)) report(arg.getStartLineNumber(), 'Mensaje', text);
      }
    }

    for (const nw of sf.getDescendantsOfKind(SyntaxKind.NewExpression)) {
      if (!/Error$/.test(nw.getExpression().getText())) continue;
      for (const arg of nw.getArguments()) {
        if (!Node.isStringLiteral(arg)) continue;
        const text = arg.getLiteralText();
        if (looksSpanish(text)) report(arg.getStartLineNumber(), 'Mensaje de error', text);
      }
    }

    // Comentarios.
    const lines = file.content.split('\n');
    for (const line of file.addedLines) {
      const raw = lines[line - 1] ?? '';
      const comment = raw.match(/(?:^|\s)\/\/\s*(.+)$|^\s*\*\s+(.+)$/);
      if (!comment) continue;
      const text = (comment[1] ?? comment[2] ?? '').trim();
      // Directivas de herramientas y URLs no son prosa.
      if (/^(eslint|@ts-|prettier|TODO|FIXME|https?:)/i.test(text)) continue;
      if (looksSpanish(text)) report(line, 'Comentario', text);
    }

    return findings;
  },
};

export const REVIEW_RULES: Rule[] = [
  ruleTestWithoutAssertion,
  ruleAssertWithoutExpect,
  ruleNoSwallowedError,
  ruleWrongTestImport,
  ruleSpanishMessage,
];
