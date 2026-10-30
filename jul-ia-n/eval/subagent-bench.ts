import 'dotenv/config';

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { dispatchSubagent, SubagentContext } from '../agents';
import { AI_PROVIDER, MODEL_REASONING } from '../models';
import { InvestigatedFailureSchema } from '../schemas/investigatedFailure';
import { SUBAGENT_NAMES, SubagentName } from '../schemas/proposal';
import {
  decideShortCircuit,
  formatKnowledgeSection,
  lookupKnowledge,
} from '../steps/knowledge';

/**
 * Fast iteration harness for a single subagent. Loads a hand-authored
 * InvestigatedFailure fixture and invokes the subagent directly — skipping
 * classify/orchestrator/verify so you can iterate on prompts + tools without
 * the full pipeline.
 *
 *   npm run ai-heal:bench -- --fixture jul-ia-n/eval/fixtures/assertFixer/PAYM-T1931.json
 *   npm run ai-heal:bench -- --fixture <path> --subagent assertFixer
 *
 * The subagent is taken from --subagent, else the fixture's "_subagent" field.
 * Run with AI_HEAL_LOG_LEVEL=debug to see every tool call the agent makes.
 */

interface BenchArgs {
  fixture?: string;
  subagent?: SubagentName;
  kb?: boolean;
}

const parseArgs = (argv: string[]): BenchArgs => {
  const args: BenchArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const next = (): string => argv[++i];
    switch (argv[i]) {
      case '--fixture':
        args.fixture = next();
        break;
      case '--subagent':
        args.subagent = next() as SubagentName;
        break;
      case '--kb':
        args.kb = true;
        break;
    }
  }
  return args;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.fixture) {
    console.error(
      'Usage: ts-node jul-ia-n/eval/subagent-bench.ts --fixture <path.json> [--subagent <name>]',
    );
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(resolve(args.fixture), 'utf-8'));
  const subagent: SubagentName | undefined = args.subagent ?? raw._subagent;
  if (!subagent || !SUBAGENT_NAMES.includes(subagent)) {
    console.error(
      `Missing/invalid subagent. Pass --subagent or set "_subagent" in the fixture. Valid: ${SUBAGENT_NAMES.join(', ')}`,
    );
    process.exit(1);
  }

  const failure = InvestigatedFailureSchema.parse(raw);
  const ctx: SubagentContext = { failure };

  if (args.kb) {
    const matches = await lookupKnowledge(failure);
    ctx.knowledgeSection = formatKnowledgeSection(matches) || undefined;
    const sc = decideShortCircuit(matches, failure.rootCauseCategory);
    console.log(
      `[kb] ${matches.length} match(es): ${matches.map((m) => `${m.entry.id}(${m.score.toFixed(2)})`).join(', ') || 'none'}`,
    );
    console.log(
      `[kb] short-circuit tier in pipeline would be: ${sc.tier} (${sc.reason}) — note: bench always runs the subagent regardless.`,
    );
  }

  console.log(
    `\n=== subagent-bench: ${subagent} on ${failure.testCaseId} (provider=${AI_PROVIDER}, model=${MODEL_REASONING}${args.kb ? ', KB on' : ''}) ===\n`,
  );

  const start = Date.now();
  const { proposal, model, usage } = await dispatchSubagent(subagent, ctx);
  const elapsedMs = Date.now() - start;

  console.log('\n────────────────────────── PROPOSAL ──────────────────────────');
  console.log(`subagent:    ${proposal.subagent}`);
  console.log(`kind:        ${proposal.kind}`);
  console.log(`confidence:  ${proposal.confidence.toFixed(2)}`);
  console.log(`model:       ${model}  (${elapsedMs}ms)`);
  console.log(`usage:       ${JSON.stringify(usage)}`);
  console.log('\nreasoning:');
  console.log(proposal.reasoning);

  if (proposal.fileChanges.length > 0) {
    console.log('\nfileChanges:');
    for (const c of proposal.fileChanges) {
      console.log(`  - ${c.action} ${c.path} (${c.contents?.length ?? 0} chars)`);
    }
  }
  if (proposal.issueBody) {
    console.log('\nissueBody:');
    console.log(proposal.issueBody);
  }
  console.log('───────────────────────────────────────────────────────────────\n');
};

main().catch((err) => {
  console.error('bench error:', err);
  process.exit(1);
});
