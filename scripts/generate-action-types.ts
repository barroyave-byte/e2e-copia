/**
 * Generates `playwright/framework/generated/actions.ts` — a discriminated union of every
 * registered DSL action, so `TestingFramework.run()` is typechecked at compile time.
 *
 * Why this exists: `TestingCase` used to be `{ action: string; params?: {} }`, which accepts
 * any action name, any parameter name and any parameter type. A spec with a hallucinated
 * action and misspelled params produced ZERO tsc errors and only failed at runtime, after
 * `beforeAll` had already spent minutes creating merchants, processors and orders. Since the
 * generated union is checked by `tsc --noEmit` (already a CI gate), those mistakes now fail
 * in the editor instead.
 *
 * Run: npm run generate-action-types
 * CI enforces that the committed output matches the plugins (`git diff --exit-code`).
 */

import { Project, SourceFile, Type, ClassDeclaration, ParameterDeclaration } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { extractDescription } from './lib/actionDescription';
import { defaultPlugins } from '../playwright/framework/core';

/**
 * Only plugins actually registered in `defaultPlugins` are emitted. A plugin that exists on
 * disk but is commented out of the registry (api.guard, at the time of writing) must not
 * reach the union — the type would advertise actions that `run()` rejects at runtime.
 */
const REGISTERED_PLUGINS = new Set(
  defaultPlugins.map((PluginClass) => new PluginClass().pluginBaseName)
);

const OUTPUT_PATH = 'playwright/framework/generated/actions.ts';

interface ActionInfo {
  fullName: string;
  description: string;
  /** Rendered TypeScript for the params object, or null when the action takes none. */
  paramsType: string | null;
  /** True when every field is optional (or there are no fields), so `params` may be omitted. */
  paramsOptional: boolean;
}

export function paramsMayBeOmitted(param: ParameterDeclaration): boolean {
  const type = param.getType();
  const alternatives = type.isUnion() ? type.getUnionTypes() : [type];
  return (
    param.isOptional() ||
    param.hasInitializer() ||
    alternatives.every((alternative) =>
      alternative.getProperties().every((property) => property.isOptional())
    )
  );
}

/**
 * Package a declaration file belongs to, or null for ambient globals (`lib.*.d.ts`) and
 * `@types/*` packages, whose types are available without an import.
 */
function packageOf(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  // `lib.*.d.ts` holds the ambient globals (Record, Partial, Date, ...). They live under
  // node_modules/typescript/lib, but importing them from 'typescript' is wrong — they are
  // always in scope.
  if (/\/lib\.[^/]*\.d\.ts$/.test(normalized)) return null;

  // pnpm nests the real package under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/,
  // so the first node_modules/ segment is `.pnpm`, not the package — take the last match.
  const matches = [...normalized.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)];
  if (matches.length === 0) return null;

  const packageName = matches[matches.length - 1][1];
  return packageName.startsWith('@types/') ? null : packageName;
}

/**
 * Renders a type as source text usable in the generated file.
 *
 * Named types are emitted by name and imported, so the generated union stays readable and
 * stays in sync with the interfaces it points at. Anonymous shapes are expanded inline.
 */
function renderType(type: Type, imports: Map<string, string>, depth = 0): string {
  if (depth > 6) return 'unknown';

  if (type.isStringLiteral()) return JSON.stringify(type.getLiteralValue());
  if (type.isNumberLiteral()) return `${type.getLiteralValue()}`;
  if (type.isBooleanLiteral()) return type.getText();
  if (type.isString()) return 'string';
  if (type.isNumber()) return 'number';
  if (type.isBoolean()) return 'boolean';
  if (type.isAny() || type.isUnknown()) return 'unknown';
  if (type.isUndefined()) return 'undefined';
  if (type.isNull()) return 'null';
  if (type.isVoid()) return 'void';

  if (type.isUnion()) {
    const parts = type.getUnionTypes();
    if (parts.length === 2 && parts.every((t) => t.isBooleanLiteral())) return 'boolean';
    return parts.map((t) => renderType(t, imports, depth + 1)).join(' | ');
  }

  if (type.isArray()) {
    const el = renderType(type.getArrayElementTypeOrThrow(), imports, depth + 1);
    return el.includes('|') ? `(${el})[]` : `${el}[]`;
  }

  // Named interface / type alias / enum → reference it by name rather than expanding it.
  const symbol = type.getAliasSymbol() ?? type.getSymbol();
  const name = symbol?.getName();
  if (name && name !== '__type' && name !== '__object') {
    const decl = symbol!.getDeclarations()[0];
    const declFile = decl?.getSourceFile();

    if (declFile && !declFile.isFromExternalLibrary() && !declFile.isDeclarationFile()) {
      imports.set(name, declFile.getFilePath());
      return name;
    }

    // Library types (Buffer, Date, Page, BrowserContext, ...). Expanding these structurally
    // is what produced 1000+ syntax errors on the first full run: `Buffer` unfolded into
    // hundreds of members including index signatures that are not valid inside an inline
    // object type. Reference them by name instead — ambient globals resolve on their own,
    // package types get an import from the package.
    const packageName = declFile && packageOf(declFile.getFilePath());
    if (packageName) {
      imports.set(name, packageName);
    }

    // Generic aliases (Record<K, V>, Partial<T>, ...) are meaningless without their
    // arguments.
    const aliasArgs = type.getAliasTypeArguments();
    if (aliasArgs.length > 0) {
      return `${name}<${aliasArgs.map((arg) => renderType(arg, imports, depth + 1)).join(', ')}>`;
    }

    return name;
  }

  const properties = type.getProperties();
  if (properties.length > 0) {
    const fields = properties.map((prop) => {
      const decl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
      const optional = prop.isOptional() ? '?' : '';
      const rendered = decl
        ? renderType(prop.getTypeAtLocation(decl), imports, depth + 1)
        : 'unknown';
      return `${prop.getName()}${optional}: ${rendered}`;
    });
    return `{ ${fields.join('; ')} }`;
  }

  return 'unknown';
}

function collectActions(classDecl: ClassDeclaration, imports: Map<string, string>): ActionInfo[] {
  const baseName = classDecl
    .getProperty('pluginBaseName')
    ?.getInitializer()
    ?.getText()
    .replace(/['"]/g, '');

  if (!baseName) return [];
  if (!REGISTERED_PLUGINS.has(baseName)) return [];

  const actions: ActionInfo[] = [];

  for (const method of classDecl.getMethods()) {
    const methodName = method.getName();
    if (!methodName.startsWith('$tf_')) continue;

    const [param] = method.getParameters();

    let paramsType: string | null = null;
    let paramsOptional = true;

    if (param) {
      const type = param.getType();
      paramsType = renderType(type, imports);
      // `params` may be omitted only when the parameter itself has a default/optional marker
      // or when no field is required.
      paramsOptional = paramsMayBeOmitted(param);
    }

    actions.push({
      fullName: `${baseName}.${methodName.slice(4)}`,
      description: extractDescription(method),
      paramsType,
      paramsOptional,
    });
  }

  return actions;
}

function renderImports(imports: Map<string, string>, outputDir: string): string {
  const byModule = new Map<string, string[]>();

  for (const [name, filePath] of imports) {
    // Package names (from `packageOf`) are already valid specifiers; local files need a
    // relative path from the generated file.
    const isPackage = !filePath.includes('/') || filePath.startsWith('@');
    let specifier = isPackage
      ? filePath
      : path
          .relative(outputDir, filePath)
          .replace(/\.tsx?$/, '')
          .replace(/\\/g, '/');
    if (!isPackage && !specifier.startsWith('.')) specifier = `./${specifier}`;

    const names = byModule.get(specifier) ?? [];
    names.push(name);
    byModule.set(specifier, names);
  }

  return [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([specifier, names]) =>
        `import type { ${[...new Set(names)].sort().join(', ')} } from '${specifier}';`
    )
    .join('\n');
}

function renderAction({ fullName, description, paramsType, paramsOptional }: ActionInfo): string {
  const doc = description ? `  /** ${description} */\n` : '';
  const params = paramsType ? `; params${paramsOptional ? '?' : ''}: ${paramsType}` : '';
  return `${doc}  | { action: '${fullName}'; stepName?: string${params} }`;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const project = new Project({ tsConfigFilePath: path.join(projectRoot, 'tsconfig.json') });

  const imports = new Map<string, string>();
  const actions: ActionInfo[] = [];

  const pluginFiles: SourceFile[] = project.getSourceFiles(
    '**/playwright/framework/plugins/**/*.ts'
  );

  for (const sourceFile of pluginFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getExtends()?.getText() !== 'FrameworkPlugin') continue;
      actions.push(...collectActions(classDecl, imports));
    }
  }

  actions.sort((a, b) => a.fullName.localeCompare(b.fullName));

  const outputDir = path.dirname(path.join(projectRoot, OUTPUT_PATH));
  fs.mkdirSync(outputDir, { recursive: true });

  const scope = `${REGISTERED_PLUGINS.size} registered plugin(s)`;

  const contents = `// GENERATED FILE — DO NOT EDIT.
// Run \`npm run generate-action-types\` after changing any plugin.
// Scope: ${scope}
// Actions: ${actions.length}

${renderImports(imports, outputDir)}

/** Every DSL action, as a discriminated union on \`action\`. */
export type ActionStep =
${actions.map(renderAction).join('\n')};

/** Action names as a union of string literals. */
export type ActionName = ActionStep['action'];
`;

  fs.writeFileSync(path.join(projectRoot, OUTPUT_PATH), contents);
  console.log(`Wrote ${OUTPUT_PATH} — ${actions.length} action(s) [${scope}]`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
