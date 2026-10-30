import { Project, Node, SourceFile, CallExpression } from 'ts-morph';
import { globSync } from 'glob';
import * as fs from 'fs';

// Playwright Page Objects mid-migration use `legacySelector.or(migratedSelector)`
// to support BaseUI and Tailwind at once. Once a component's Tailwind version is
// stable in prod and rollback is no longer possible, mark the statement with a
// trailing `// migration-or` comment; this script then collapses it down to just
// the migrated selector. Unmarked `.or()` calls may be permanent alternatives
// unrelated to the migration, so they're only reported, never touched. Chained
// `A.or(B).or(C)` sequences are always left alone — ambiguous which side(s) survive.

const DEFAULT_GLOB = 'playwright/pages/**/*.ts';
const MIGRATION_MARKER = /^\/\/\s*migration-or\s*$/;

type Status = 'marked' | 'unmarked' | 'chained';

function isOrCall(node: Node): node is CallExpression {
  if (!Node.isCallExpression(node)) return false;
  const expr = node.getExpression();
  return Node.isPropertyAccessExpression(expr) && expr.getName() === 'or';
}

function isChainedOrCall(callExpr: CallExpression): boolean {
  const receiver = callExpr.getExpression();
  if (Node.isPropertyAccessExpression(receiver) && isOrCall(receiver.getExpression())) {
    return true;
  }
  const parent = callExpr.getParent();
  return (
    Node.isPropertyAccessExpression(parent) &&
    parent.getName() === 'or' &&
    Node.isCallExpression(parent.getParent())
  );
}

function getEnclosingStatement(callExpr: CallExpression): Node {
  const statement = callExpr.getFirstAncestor((n) => Node.isStatement(n));
  if (!statement) {
    throw new Error(
      `.or() call at line ${callExpr.getStartLineNumber()} has no enclosing statement`
    );
  }
  return statement;
}

function findMigrationMarker(statement: Node): { pos: number; end: number } | undefined {
  const range = statement
    .getTrailingCommentRanges()
    .find((r) => MIGRATION_MARKER.test(r.getText().trim()));
  if (!range) return undefined;

  const fullText = statement.getSourceFile().getFullText();
  let start = range.getPos();
  while (start > 0 && (fullText[start - 1] === ' ' || fullText[start - 1] === '\t')) {
    start--;
  }
  return { pos: start, end: range.getEnd() };
}

function statusOf(callExpr: CallExpression, statement: Node): Status {
  if (isChainedOrCall(callExpr)) return 'chained';
  return findMigrationMarker(statement) ? 'marked' : 'unmarked';
}

function collapse(sourceFile: SourceFile): string {
  const edits: { start: number; end: number; replacement: string }[] = [];

  for (const callExpr of sourceFile
    .getDescendants()
    .filter((n): n is CallExpression => isOrCall(n))) {
    if (isChainedOrCall(callExpr)) continue;

    const statement = getEnclosingStatement(callExpr);
    const marker = findMigrationMarker(statement);
    if (!marker) continue;

    const [migratedArg] = callExpr.getArguments();
    edits.push({
      start: callExpr.getStart(),
      end: callExpr.getEnd(),
      replacement: migratedArg.getText(),
    });
    edits.push({ start: marker.pos, end: marker.end, replacement: '' });
  }

  const sorted = [...edits].sort((a, b) => b.start - a.start);
  return sorted.reduce(
    (text, e) => text.slice(0, e.start) + e.replacement + text.slice(e.end),
    sourceFile.getFullText()
  );
}

function parseArgs(argv: string[]): { glob: string; write: boolean } {
  const write = argv.includes('--write');
  const glob = argv.find((a) => a !== '--write') ?? DEFAULT_GLOB;
  return { glob, write };
}

function main() {
  const { glob, write } = parseArgs(process.argv.slice(2));
  const files = globSync(glob, { nodir: true });

  if (files.length === 0) {
    console.log(`No files matched glob: ${glob}`);
    return;
  }

  const project = new Project();
  const totals: Record<Status, number> = { marked: 0, unmarked: 0, chained: 0 };
  let filesChanged = 0;

  for (const filePath of files) {
    const sourceFile = project.addSourceFileAtPath(filePath);
    const orCalls = sourceFile.getDescendants().filter((n): n is CallExpression => isOrCall(n));
    if (orCalls.length === 0) continue;

    for (const callExpr of orCalls) {
      const statement = getEnclosingStatement(callExpr);
      const status = statusOf(callExpr, statement);
      totals[status]++;
      console.log(
        `${filePath}:${statement.getStartLineNumber()} [${status}] ${statement.getText().split('\n')[0]}`
      );
    }

    if (write) {
      const newText = collapse(sourceFile);
      if (newText !== sourceFile.getFullText()) {
        fs.writeFileSync(filePath, newText, 'utf-8');
        filesChanged++;
      }
    }
  }

  console.log('\nSummary:');
  console.log(`  marked (collapse candidates): ${totals.marked}`);
  console.log(`  unmarked (needs review):      ${totals.unmarked}`);
  console.log(`  chained (manual only):        ${totals.chained}`);
  if (write) {
    console.log(`  files rewritten:              ${filesChanged}`);
    console.log('\nRun `npm run format-code` to normalize formatting.');
  } else {
    console.log(
      '\nDry run only. Pass --write to apply collapses to marked, non-chained occurrences.'
    );
  }
}

main();
