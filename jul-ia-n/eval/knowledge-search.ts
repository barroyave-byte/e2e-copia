import 'dotenv/config';

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { EMBEDDINGS_MODEL } from '../models';
import { ClassifiedFailure } from '../schemas/classifiedFailure';
import {
  formatKnowledgeSection,
  lookupKnowledge,
} from '../steps/knowledge';

/**
 * Validate KB retrieval without the pipeline. Either pass a free-text query, or
 * a fixture JSON (a ClassifiedFailure / InvestigatedFailure) to match against.
 *
 *   npm run ai-heal:kb -- --query "nupay test fails waiting for purchase request"
 *   npm run ai-heal:kb -- --fixture jul-ia-n/eval/fixtures/assertFixer/PAYM-T1931.json
 *
 * Prints ranked matches + the advisory section that would be injected.
 */

interface Args {
  query?: string;
  fixture?: string;
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const next = (): string => argv[++i];
    if (argv[i] === '--query') args.query = next();
    else if (argv[i] === '--fixture') args.fixture = next();
  }
  return args;
};

const failureFromQuery = (query: string): ClassifiedFailure => ({
  testCaseId: 'QUERY',
  testDescription: query,
  teamOwner: 'team_unknown',
  errorIdentified: query,
  rootCause: query,
  rootCauseCategory: 'unknown',
  isCredentialIssue: false,
  failedStep: '',
});

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query && !args.fixture) {
    console.error(
      'Usage: ts-node jul-ia-n/eval/knowledge-search.ts (--query "<text>" | --fixture <path.json>)',
    );
    process.exit(1);
  }

  const failure: ClassifiedFailure = args.fixture
    ? (JSON.parse(readFileSync(resolve(args.fixture), 'utf-8')) as ClassifiedFailure)
    : failureFromQuery(args.query!);

  console.log(`\n=== knowledge-search (model=${EMBEDDINGS_MODEL}) ===`);
  console.log(`query source: ${args.fixture ?? `"${args.query}"`}\n`);

  const matches = await lookupKnowledge(failure);
  if (matches.length === 0) {
    console.log('No matches above threshold.\n');
    return;
  }

  for (const m of matches) {
    console.log(
      `- [${m.score.toFixed(3)} | sim=${m.similarity.toFixed(3)}${m.exactTestCaseMatch ? ' | exact' : ''}] ${m.entry.id} — ${m.entry.title}`,
    );
  }

  console.log('\n──────── advisory section that would be injected ────────\n');
  console.log(formatKnowledgeSection(matches));
};

main().catch((err) => {
  console.error('knowledge-search error:', err);
  process.exit(1);
});
