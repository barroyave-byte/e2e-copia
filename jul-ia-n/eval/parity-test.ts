import 'dotenv/config';

import { readFileSync } from 'fs';

import {
  getStructuredOutput as getStructuredOutputAnthropic,
} from '../models/anthropic';
import {
  getStructuredOutput as getStructuredOutputOpenAi,
} from '../models/openai';
import { GROUP_PROMPT } from '../prompts/group';
import {
  ClassifiedFailure,
  FailureAnalysis,
  FailureAnalysisSchema,
  ROOT_CAUSE_CATEGORIES,
  TEAM_OWNERS,
} from '../schemas/classifiedFailure';
import { normalize } from '../steps/normalize';

const PARITY_THRESHOLD = 0.05;

const failureAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['failures'],
  properties: {
    failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'testCaseId',
          'testDescription',
          'teamOwner',
          'errorIdentified',
          'rootCause',
          'rootCauseCategory',
          'isCredentialIssue',
          'failedStep',
        ],
        properties: {
          testCaseId: { type: 'string' },
          testDescription: { type: 'string' },
          teamOwner: { type: 'string', enum: [...TEAM_OWNERS] },
          errorIdentified: { type: 'string' },
          rootCause: { type: 'string' },
          rootCauseCategory: {
            type: 'string',
            enum: [...ROOT_CAUSE_CATEGORIES],
          },
          isCredentialIssue: { type: 'boolean' },
          failedStep: { type: 'string' },
        },
      },
    },
  },
};

const classifyWith = async (
  fn: typeof getStructuredOutputOpenAi,
  reportText: string,
): Promise<FailureAnalysis> => {
  const result = await fn<FailureAnalysis>({
    systemPrompt: GROUP_PROMPT(),
    userInput: reportText,
    toolName: 'classify_failures',
    toolDescription:
      'Classify a list of Playwright E2E test failures by root cause and team owner.',
    inputSchema: failureAnalysisSchema,
    temperature: 0,
  });
  return FailureAnalysisSchema.parse(result.data);
};

interface FieldDiff {
  field: keyof ClassifiedFailure;
  matches: number;
  total: number;
  rate: number;
  mismatches: Array<{
    testCaseId: string;
    openai: unknown;
    anthropic: unknown;
  }>;
}

const compareField = (
  field: keyof ClassifiedFailure,
  openai: ClassifiedFailure[],
  anthropic: ClassifiedFailure[],
): FieldDiff => {
  const byId = new Map(anthropic.map((f) => [f.testCaseId, f]));
  let matches = 0;
  const mismatches: FieldDiff['mismatches'] = [];
  for (const oa of openai) {
    const an = byId.get(oa.testCaseId);
    if (!an) continue;
    if (oa[field] === an[field]) {
      matches++;
    } else {
      mismatches.push({
        testCaseId: oa.testCaseId,
        openai: oa[field],
        anthropic: an[field],
      });
    }
  }
  const total = openai.length;
  return { field, matches, total, rate: matches / total, mismatches };
};

const isParityEnabled = (): boolean =>
  (process.env.AI_PARITY_ENABLED || 'false').toLowerCase() === 'true';

const main = async () => {
  if (!isParityEnabled()) {
    console.log(
      'Parity test skipped: set AI_PARITY_ENABLED=true to run it. ' +
        'Requires both OPENAI_API_KEY and ANTHROPIC_API_KEY.',
    );
    process.exit(0);
  }

  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error(
      'Parity test requires both OPENAI_API_KEY and ANTHROPIC_API_KEY to be set.',
    );
    process.exit(1);
  }

  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      'Usage: ts-node jul-ia-n/eval/parity-test.ts <path-to-test-results.json>',
    );
    process.exit(1);
  }

  const raw = readFileSync(inputPath, 'utf-8');
  const { output: reportText, failedTests } = normalize(raw);
  console.log(`Normalized ${failedTests.length} failed tests.`);
  console.log(`Running OpenAI and Anthropic classifiers in parallel...\n`);

  const [openAiResult, anthropicResult] = await Promise.all([
    classifyWith(getStructuredOutputOpenAi, reportText),
    classifyWith(getStructuredOutputAnthropic, reportText),
  ]);

  const openai = openAiResult.failures;
  const anthropic = anthropicResult.failures;

  console.log(`OpenAI returned   ${openai.length} classifications`);
  console.log(`Anthropic returned ${anthropic.length} classifications\n`);

  const fieldsToCompare: Array<keyof ClassifiedFailure> = [
    'rootCauseCategory',
    'isCredentialIssue',
    'teamOwner',
  ];

  let allPassed = true;
  for (const field of fieldsToCompare) {
    const diff = compareField(field, openai, anthropic);
    const passed = 1 - diff.rate <= PARITY_THRESHOLD;
    if (!passed) allPassed = false;
    const pct = (diff.rate * 100).toFixed(1);
    const status = passed ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${field}: ${diff.matches}/${diff.total} match (${pct}%)`,
    );
    if (diff.mismatches.length && !passed) {
      console.log(`  First 5 mismatches:`);
      for (const m of diff.mismatches.slice(0, 5)) {
        console.log(
          `    ${m.testCaseId}: openai=${JSON.stringify(m.openai)} vs anthropic=${JSON.stringify(m.anthropic)}`,
        );
      }
    }
  }

  console.log(
    `\nThreshold: ≤${PARITY_THRESHOLD * 100}% diff per field (≥${(1 - PARITY_THRESHOLD) * 100}% match required)`,
  );
  console.log(`\nResult: ${allPassed ? 'PARITY OK' : 'PARITY FAILED'}`);
  process.exit(allPassed ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
