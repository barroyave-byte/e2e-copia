import { Project, Type } from 'ts-morph';
import * as path from 'path';
import { extractDescription } from './lib/actionDescription';

function typeToSignature(type: Type, depth = 0, visited = new Set<string>()): string {
  if (depth > 5) return '...';

  if (type.isStringLiteral()) return `"${type.getLiteralValue()}"`;
  if (type.isNumberLiteral()) return `${type.getLiteralValue()}`;
  if (type.isBooleanLiteral()) return `${type.getLiteralValue()}`;
  if (type.isString()) return 'string';
  if (type.isNumber()) return 'number';
  if (type.isUndefined()) return 'undefined';
  if (type.isNull()) return 'null';
  if (type.isAny()) return 'any';
  if (type.isBoolean() || type.getText() === 'boolean') return 'boolean';

  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();
    if (unionTypes.length === 2 && unionTypes.every((t) => t.isBooleanLiteral())) return 'boolean';
    return unionTypes.map((t) => typeToSignature(t, depth + 1, visited)).join(' | ');
  }

  if (type.isArray()) {
    const el = typeToSignature(type.getArrayElementTypeOrThrow(), depth + 1, visited);
    return el.includes('|') ? `(${el})[]` : `${el}[]`;
  }

  const symbolId = (type.getSymbol() || type.getAliasSymbol())?.getName();
  if (symbolId) {
    if (visited.has(symbolId)) return symbolId;
    visited.add(symbolId);
  }

  const properties = type.getProperties();
  if (properties.length > 0) {
    const fields = properties
      .map((prop) => {
        const decl = prop.getValueDeclaration() || prop.getDeclarations()[0];
        if (!decl) return null;
        const opt = prop.isOptional() ? '?' : '';
        const sig = typeToSignature(prop.getTypeAtLocation(decl), depth + 1, new Set(visited));
        return `${prop.getName()}${opt}: ${sig}`;
      })
      .filter(Boolean);
    return `{ ${fields.join(', ')} }`;
  }

  return type.getText();
}

function getParamSignature(type: Type): string {
  const properties = type.getProperties();
  if (properties.length === 0) return typeToSignature(type);

  // If it's a destructured object param, show each field as a named param
  return properties
    .map((prop) => {
      const decl = prop.getValueDeclaration() || prop.getDeclarations()[0];
      if (!decl) return prop.getName();
      const opt = prop.isOptional() ? '?' : '';
      const sig = typeToSignature(prop.getTypeAtLocation(decl), 0, new Set());

      const jsDocs = 'getJsDocs' in decl ? (decl as any).getJsDocs() : [];
      const desc =
        jsDocs.length > 0
          ? ` // ${jsDocs.map((doc: any) => doc.getDescription().trim()).join(' ')}`
          : '';

      return `  ${prop.getName()}${opt}: ${sig}${desc}`;
    })
    .join('\n');
}

function printAction(fullName: string, method: any) {
  const description = extractDescription(method);

  const params = method.getParameters();
  const paramBlock =
    params.length === 0
      ? '  (no parameters)'
      : params.map((p: any) => getParamSignature(p.getType())).join('\n');

  console.log(`${fullName}`);
  if (description) console.log(`  ${description}`);
  console.log(`params:`);
  console.log(paramBlock);
  console.log('');
}

async function main() {
  // `npm run describe-actions -- a b` forwards the `--` separator itself in argv, which
  // used to be treated as an action name and reported as `Not found: --`.
  const requested = process.argv.slice(2).filter((arg) => arg !== '--');
  if (requested.length === 0) {
    console.error('Usage: describe-actions.ts <action1> <action2> ...');
    console.error(
      'Example: describe-actions.ts checkout.paymentWidget.fillCreditCardData admin.login'
    );
    process.exit(1);
  }

  const requestedSet = new Set(requested);
  const projectRoot = path.resolve(__dirname, '..');
  const project = new Project({ tsConfigFilePath: path.join(projectRoot, 'tsconfig.json') });
  const pluginFiles = project.getSourceFiles('**/playwright/framework/plugins/**/*.ts');

  const found = new Set<string>();

  for (const sourceFile of pluginFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getExtends()?.getText() !== 'FrameworkPlugin') continue;

      const baseName =
        classDecl.getProperty('pluginBaseName')?.getInitializer()?.getText().replace(/['"]/g, '') ||
        classDecl.getName() ||
        'Unknown';

      for (const method of classDecl.getMethods()) {
        const name = method.getName();
        if (!name.startsWith('$tf_')) continue;

        const fullName = `${baseName}.${name.slice(4)}`;
        if (!requestedSet.has(fullName)) continue;

        found.add(fullName);
        printAction(fullName, method);
      }
    }
  }

  const notFound = requested.filter((r) => !found.has(r));
  if (notFound.length > 0) {
    console.error(`Not found: ${notFound.join(', ')}`);
  }
}

main().catch(console.error);
