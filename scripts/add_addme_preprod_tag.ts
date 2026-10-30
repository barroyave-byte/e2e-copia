import * as fs from 'fs';
import * as path from 'path';

import { globSync } from 'glob';
import {
  Project,
  SyntaxKind,
  type CallExpression,
  type ObjectLiteralExpression,
  type ArrayLiteralExpression,
} from 'ts-morph';

type UpdateResult = {
  id: string;
  file?: string;
  status:
    | 'updated'
    | 'skipped_already_present'
    | 'skipped_no_tag_object'
    | 'skipped_no_matching_test'
    | 'skipped_multiple_files'
    | 'error';
  details?: string;
};

type Mode = 'add' | 'replace';

const DEFAULT_TO_TAG = '@preprod';
const DEFAULT_FROM_TAG = '@preprod';

const normalizeId = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  const withoutExt = withoutAt.endsWith('.spec.ts')
    ? withoutAt.slice(0, -'.spec.ts'.length)
    : withoutAt;
  return withoutExt.trim();
};

const readIdsFromStdin = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
};

const loadIds = async (argPath?: string): Promise<string[]> => {
  let content = '';

  if (argPath) {
    const resolved = path.resolve(process.cwd(), argPath);
    content = fs.readFileSync(resolved, 'utf8');
  } else {
    content = await readIdsFromStdin();
  }

  return content.split(/\r?\n/).map(normalizeId).filter(Boolean);
};

const findSpecFileForId = (id: string): string[] => {
  const pattern = path.posix.join('playwright', 'tests', '**', `${id}.spec.ts`);
  const matches = globSync(pattern, {
    nodir: true,
  });

  return matches;
};

const getOptionsObjectArg = (call: CallExpression): ObjectLiteralExpression | undefined => {
  const args = call.getArguments();
  if (args.length < 2) return undefined;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.getKind() === SyntaxKind.ObjectLiteralExpression) {
      return a.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    }

    if (a.getKind() === SyntaxKind.ArrowFunction || a.getKind() === SyntaxKind.FunctionExpression) {
      break;
    }
  }

  return undefined;
};

const getTagArray = (optionsObj: ObjectLiteralExpression): ArrayLiteralExpression | undefined => {
  const prop = optionsObj
    .getProperties()
    .find(
      (p) =>
        p.getKind() === SyntaxKind.PropertyAssignment &&
        ['tag', 'tags'].includes(p.asKindOrThrow(SyntaxKind.PropertyAssignment).getName())
    );

  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) return undefined;

  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer) return undefined;

  return initializer.asKind(SyntaxKind.ArrayLiteralExpression);
};

const callHasMatchingId = (call: CallExpression, id: string): boolean => {
  const args = call.getArguments();
  if (args.length === 0) return false;

  const first = args[0];
  if (
    first.getKind() !== SyntaxKind.StringLiteral &&
    first.getKind() !== SyntaxKind.NoSubstitutionTemplateLiteral
  ) {
    return false;
  }

  const title = first.getText().slice(1, -1);
  return title.includes(`@${id}`);
};

const parseTagsFromArray = (tagArray: ArrayLiteralExpression): string[] => {
  return tagArray
    .getElements()
    .map((e) =>
      e
        .getText()
        .replace(/^['"`]/, '')
        .replace(/['"`]$/, '')
        .trim()
    )
    .filter(Boolean);
};

const uniqPreserveOrder = (items: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(i);
  }
  return out;
};

const addOrReplaceTagInArray = (
  tagArray: ArrayLiteralExpression,
  mode: Mode,
  toTag: string,
  fromTag: string
): { updated: boolean; alreadyOk: boolean } => {
  const existing = parseTagsFromArray(tagArray);

  if (mode === 'add') {
    if (existing.includes(toTag)) return { updated: false, alreadyOk: true };
    tagArray.addElement(`'${toTag}'`);
    return { updated: true, alreadyOk: false };
  }

  const hasFrom = existing.includes(fromTag);
  const hasTo = existing.includes(toTag);

  if (!hasFrom && hasTo) {
    return { updated: false, alreadyOk: true };
  }

  let next = existing.map((t) => (t === fromTag ? toTag : t));
  if (!hasFrom && !hasTo) next = [...next, toTag];
  next = uniqPreserveOrder(next);

  tagArray.replaceWithText(`[${next.map((t) => `'${t}'`).join(', ')}]`);
  return { updated: true, alreadyOk: false };
};

const addTagToFile = (
  project: Project,
  specPath: string,
  id: string,
  mode: Mode,
  toTag: string,
  fromTag: string
): UpdateResult => {
  try {
    const sourceFile = project.addSourceFileAtPath(specPath);
    const testCalls = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((c) => c.getExpression().getText() === 'test');

    const matching = testCalls.filter((c) => callHasMatchingId(c, id));
    if (matching.length === 0) {
      return { id, file: specPath, status: 'skipped_no_matching_test' };
    }

    let anyUpdated = false;
    let anyAlreadyPresent = false;
    let anyNoTagObject = false;

    for (const call of matching) {
      const optionsObj = getOptionsObjectArg(call);
      if (!optionsObj) {
        anyNoTagObject = true;
        continue;
      }

      let tagArray = getTagArray(optionsObj);

      if (!tagArray) {
        optionsObj.addPropertyAssignment({
          name: 'tag',
          initializer: `['${toTag}']`,
        });
        anyUpdated = true;
        continue;
      }

      const { updated, alreadyOk } = addOrReplaceTagInArray(tagArray, mode, toTag, fromTag);
      if (alreadyOk) {
        anyAlreadyPresent = true;
      }
      if (updated) {
        anyUpdated = true;
      }
    }

    if (anyUpdated) {
      sourceFile.saveSync();
      return { id, file: specPath, status: 'updated' };
    }

    if (anyAlreadyPresent) {
      return { id, file: specPath, status: 'skipped_already_present' };
    }

    if (anyNoTagObject) {
      return { id, file: specPath, status: 'skipped_no_tag_object' };
    }

    return { id, file: specPath, status: 'error', details: 'Unknown state' };
  } catch (e) {
    return {
      id,
      file: specPath,
      status: 'error',
      details: e instanceof Error ? e.message : String(e),
    };
  }
};

const parseArgs = (argv: string[]) => {
  const args = [...argv];
  let idsPath: string | undefined;
  let mode: Mode = 'add';
  let toTag = DEFAULT_TO_TAG;
  let fromTag = DEFAULT_FROM_TAG;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === '-h' || a === '--help') {
      return { help: true as const };
    }

    if (a === '--mode') {
      const v = args[i + 1];
      if (!v || (v !== 'add' && v !== 'replace')) {
        throw new Error("Invalid --mode. Expected 'add' or 'replace'.");
      }
      mode = v;
      i++;
      continue;
    }

    if (a === '--to') {
      const v = args[i + 1];
      if (!v) throw new Error('Missing value for --to');
      toTag = v;
      i++;
      continue;
    }

    if (a === '--from') {
      const v = args[i + 1];
      if (!v) throw new Error('Missing value for --from');
      fromTag = v;
      i++;
      continue;
    }

    if (a.startsWith('-')) {
      throw new Error(`Unknown option: ${a}`);
    }

    if (!idsPath) {
      idsPath = a;
      continue;
    }

    throw new Error(`Unexpected argument: ${a}`);
  }

  return { help: false as const, idsPath, mode, toTag, fromTag };
};

const main = async () => {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    process.exit(1);
  }

  if (parsed.help) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/add_addme_preprod_tag.ts [options] <ids.txt>');
    console.log('  cat ids.txt | npx ts-node scripts/add_addme_preprod_tag.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --mode <add|replace>   Default: add');
    console.log(`  --to <tag>             Default: ${DEFAULT_TO_TAG}`);
    console.log(
      `  --from <tag>           Default: ${DEFAULT_FROM_TAG} (only meaningful in replace mode)`
    );
    process.exit(0);
  }

  const { idsPath, mode, toTag, fromTag } = parsed;

  let ids: string[];
  try {
    ids = await loadIds(idsPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Failed to load IDs: ${msg}`);
    process.exit(1);
  }
  if (ids.length === 0) {
    console.error('No IDs provided. Provide a file path as arg or pipe IDs via stdin.');
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const results: UpdateResult[] = [];

  for (const id of ids) {
    const matches = findSpecFileForId(id);
    if (matches.length === 0) {
      results.push({ id, status: 'error', details: `Spec not found for ${id}` });
      continue;
    }

    if (matches.length > 1) {
      results.push({ id, status: 'skipped_multiple_files', details: matches.join(', ') });
      continue;
    }

    const specPath = matches[0];
    results.push(addTagToFile(project, specPath, id, mode, toTag, fromTag));
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');

  console.log(summary);

  const problematic = results.filter(
    (r) => r.status !== 'updated' && r.status !== 'skipped_already_present'
  );
  if (problematic.length) {
    for (const r of problematic) {
      const loc = r.file ? ` (${r.file})` : '';
      const details = r.details ? `: ${r.details}` : '';
      console.log(`${r.id}${loc} -> ${r.status}${details}`);
    }
  }

  const hasErrors = results.some((r) => r.status === 'error');
  process.exit(hasErrors ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
