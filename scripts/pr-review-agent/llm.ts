import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ChangedFile, DOCS, Finding } from './types';
import { DuplicateCandidate } from './rules.repo';

/**
 * Advisory review pass, covering what an AST cannot judge: network listener
 * ordering, implicit merchant credentials, unscoped text locators, unchecked
 * `.find()` results, and whether a migrated spec still tests its original intent.
 *
 * Findings from this pass are capped at 'info' severity and never block a pull
 * request. A missing API key or a failed request degrades to zero findings, so
 * the deterministic pass always stands on its own.
 */

const MAX_FILES = Number(process.env.PR_AGENT_LLM_MAX_FILES ?? 12);
const MAX_CHARS_PER_FILE = 12_000;
/**
 * Output budget for the advisory response.
 *
 * Sized so the findings array is never the constraint: a finding costs roughly
 * 100-150 tokens, so this holds well over a hundred of them. The models in use
 * accept up to 65536, but requesting the whole ceiling on every call buys
 * nothing and slows the response.
 */
const MAX_OUTPUT_TOKENS = 16_384;

/**
 * Optional ceiling on advisory findings.
 *
 * Unset means no limit: a large pull request can legitimately carry more issues
 * than any fixed number, and truncating the list hides real problems. Set
 * PR_AGENT_LLM_MAX_FINDINGS to cap it.
 */
const MAX_FINDINGS = process.env.PR_AGENT_LLM_MAX_FINDINGS
  ? Math.max(1, Number(process.env.PR_AGENT_LLM_MAX_FINDINGS))
  : Infinity;

type Provider = 'anthropic' | 'openai';

/**
 * Providers to attempt, in order: OpenAI first, then Anthropic as a fallback.
 *
 * PR_AGENT_LLM_PROVIDER pins a single provider and skips the chain. Otherwise
 * every provider with a key configured is tried in turn, so a provider-side
 * failure such as an exhausted balance falls through to the next one instead of
 * losing the advisory pass for that pull request.
 */
function providerChain(): Provider[] {
  const pinned = process.env.PR_AGENT_LLM_PROVIDER?.toLowerCase();
  if (pinned === 'anthropic' || pinned === 'openai') return [pinned];

  const chain: Provider[] = [];
  if (process.env.OPENAI_API_KEY) chain.push('openai');
  if (process.env.ANTHROPIC_API_KEY) chain.push('anthropic');
  return chain;
}

/** Model per provider, overridable to match whatever the rest of the repo uses. */
function modelFor(provider: Provider): string {
  if (provider === 'anthropic') {
    return process.env.PR_AGENT_ANTHROPIC_MODEL ?? 'claude-sonnet-5';
  }
  return process.env.PR_AGENT_OPENAI_MODEL ?? process.env.OPENAI_MODEL_CLASSIFY ?? 'gpt-5.6-luna';
}

/**
 * Sends the review prompt and returns the model's raw text.
 *
 * The prompt, the response format and the parsing are identical across
 * providers; only the request shape differs, which is why this is the single
 * provider-specific function in the pass.
 */
async function complete(provider: Provider, system: string, user: string): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: modelFor(provider),
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: modelFor(provider),
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? '';
}

interface LlmFinding {
  file: string;
  line: number;
  title: string;
  message: string;
  suggestion?: string;
  pattern: string;
}

function systemPrompt(flakyDoc: string): string {
  return [
    'You are the senior reviewer of the DEUNA E2E suite (Playwright + TypeScript).',
    '',
    'CRITICAL CONTEXT: two frameworks coexist in this repository during migration.',
    '- DSL (new): the spec imports `TestingFramework`; locators live in `playwright/framework/plugins/**` and the test only orchestrates action steps.',
    '- POM (legacy): the spec imports Page Objects from `@pages/*`; locators live in the Page Class `constructor`.',
    'Judge every file against the standard of ITS OWN framework. Never ask for an existing legacy spec to be converted to the DSL as a condition of the pull request.',
    '',
    'An AST linter already covered, deterministically: test case IDs, locators in specs, fragile selectors,',
    '`waitForTimeout`, `test.only`, hardcoded credentials, commented-out code and swallowed errors. DO NOT repeat those findings.',
    '',
    'TIMEOUTS ARE NOT FINDINGS:',
    '- DO NOT flag or comment on missing explicit timeouts in action methods like .click(), .fill(), .selectOption(), etc. Omitting explicit timeouts is valid and encouraged, as default framework timeouts handle auto-waiting.',
    '- DO NOT suggest adding an explicit `{ timeout }` to `toBeVisible()`, `toHaveText()`, or any other built-in Playwright assertion. `expect.timeout` in `playwright.config.ts` already applies to every assertion.',
    '- The only timeout you may report is one that the flaky-patterns doc below diagnoses for that exact element as an observed failure. Quote that case in the message. A general preference for more time is never a finding.',
    '- If the flaky-patterns doc asks for bounded waits with messages, read it as applying to elements documented as absent or slow in that case, never as a requirement on every action.',
    '',
    'NOT FINDINGS (the team reviewed these and rejected them in past pull requests):',
    '- Locators for pages that drive a third-party UI (a payment provider widget, a hosted checkout, or a cross-origin iframe the team does not control). Those elements cannot receive `data-testid` attributes, so a text or CSS locator there is correct. Two page classes for two external providers are not duplicated code.',
    '- Sandbox or staging endpoints and sandbox test keys (for example `sk_test_*`, `pk_test_*`) used to register a processor or create orders through the API. They are not production credentials.',
    '- A method whose assertion is a `expect.poll(...)` or `expect.toPass(...)` call. Those are assertions.',
    '- Code comments that explain a deliberate choice, such as an unused parameter prefixed with `_` or a documented temporary workaround.',
    '',
    'Alongside the flakiness patterns, judge the DUPLICATE CANDIDATES supplied at the end (if any):',
    'each is a pair of a new method and an existing one that a deterministic index matched by name.',
    'You decide whether they genuinely do the same thing. If they do, report it with pattern',
    '"duplicate-function" and name the one to reuse. If they do not, stay silent.',
    '',
    'Your other task is the flakiness patterns that require judgement, documented here:',
    '',
    '<flaky-patterns>',
    flakyDoc.slice(0, 20_000),
    '</flaky-patterns>',
    '',
    'WHAT COUNTS AS A FINDING: a defect with a concrete consequence, such as a test that can pass while broken,',
    'a failure that will reproduce at runtime, a credential or data value used wrongly, or logic that does not',
    'match the test title. Style preferences and suggestions for possible improvement are not findings.',
    '',
    'OUTPUT RULES:',
    '- Report only what you can justify by pointing at a specific line of the diff.',
    '- If you are unsure, DO NOT report. A false positive costs more than a missed finding: it erodes trust in the agent.',
    '- Report at most ONE finding per pattern per file. Point at the first affected added line and state in `message` how many other added lines in that file have the same defect. Repeating the same message on every line is noise, not information.',
    MAX_FINDINGS === Infinity
      ? '- Report every finding you can justify, ordered most important first. Do not pad the list.'
      : `- At most ${MAX_FINDINGS} findings, ordered most important first.`,
    '- Include `suggestion` only when the replacement is valid, complete code for that line. Otherwise omit it.',
    '- Write `title` and `message` in SPANISH, so they match the rest of the pull request comment.',
    '- Respond with a JSON array ONLY. No prose, no code fences.',
    '',
    'Format: [{"file":"...","line":123,"title":"...","message":"...","pattern":"listener-ordering","suggestion":"..."}]',
  ].join('\n');
}

function renderDiffForLlm(files: ChangedFile[]): string {
  return files
    .slice(0, MAX_FILES)
    .map((f) => {
      const lines = f.content.split('\n');
      const added = [...f.addedLines].sort((a, b) => a - b);

      // The whole file is sent with added lines marked, because judging these
      // patterns needs surrounding context (where a listener is registered, for
      // example) while findings stay restricted to the added lines.
      const body = lines
        .map((l, i) => `${added.includes(i + 1) ? '+' : ' '} ${i + 1}| ${l}`)
        .join('\n')
        .slice(0, MAX_CHARS_PER_FILE);

      return [
        `<file path="${f.path}" framework="${f.framework}" status="${f.status}">`,
        '(lines marked with + are the ones ADDED by this pull request; only those are reportable)',
        body,
        '</file>',
      ].join('\n');
    })
    .join('\n\n');
}

function renderCandidates(candidates: DuplicateCandidate[]): string {
  if (!candidates.length) return '';
  return [
    '',
    '<duplicate-candidates>',
    ...candidates.map(
      (c) =>
        `${c.file}:${c.line} — método nuevo \`${c.newMethod}()\` se parece a: ` +
        c.matches.map((m) => `${m.name}() en ${m.file}`).join(', ')
    ),
    '</duplicate-candidates>',
  ].join('\n');
}

/** Outcome of the advisory pass, so the summary can state what actually ran. */
export type LlmStatus = 'ok' | 'failed' | 'no-key' | 'nothing-to-review';

export interface LlmResult {
  findings: Finding[];
  status: LlmStatus;
  /** Provider that produced the findings, for the summary and the job log. */
  provider?: string;
}

export async function runLlmPass(
  files: ChangedFile[],
  repoRoot: string,
  candidates: DuplicateCandidate[] = []
): Promise<LlmResult> {
  const chain = providerChain();
  if (!chain.length) {
    console.log(
      '[pr-review-agent] No OPENAI_API_KEY or ANTHROPIC_API_KEY: skipping the advisory pass (non-blocking).'
    );
    return { findings: [], status: 'no-key' };
  }

  const auditable = files.filter((f) => f.addedLines.size > 0);
  if (!auditable.length) return { findings: [], status: 'nothing-to-review' };

  const flakyDocPath = path.join(repoRoot, 'docs/flaky-test-patterns.md');
  const flakyDoc = fs.existsSync(flakyDocPath) ? fs.readFileSync(flakyDocPath, 'utf8') : '';

  const system = systemPrompt(flakyDoc);
  const user = `Review the changes in this pull request:\n\n${renderDiffForLlm(auditable)}${renderCandidates(candidates)}`;

  for (const provider of chain) {
    const label = `${provider}/${modelFor(provider)}`;
    try {
      const text = await complete(provider, system, user);
      console.log(`[pr-review-agent] Advisory pass completed with ${label}.`);
      return { findings: parseLlmFindings(text, auditable), status: 'ok', provider: label };
    } catch (err) {
      // A provider failure falls through to the next one; exhausting the chain
      // returns no findings rather than failing the run.
      console.error(`[pr-review-agent] Advisory pass failed with ${label}: ${err}`);
    }
  }

  console.error('[pr-review-agent] No LLM provider responded; continuing with the AST pass only.');
  return { findings: [], status: 'failed' };
}

/**
 * Extracts the JSON objects of an array one at a time, tolerating a response
 * that was cut off before the closing bracket.
 *
 * Parsing the array as a whole means a reply truncated by the output budget
 * fails outright and every finding is lost. Reading object by object costs only
 * the incomplete one at the tail.
 *
 * Brace depth is tracked outside of string literals, so a brace inside a
 * message does not desynchronise the scan.
 */
function extractJsonObjects(text: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        try {
          out.push(JSON.parse(text.slice(objectStart, i + 1)));
        } catch {
          // A malformed object is skipped; the rest of the array still counts.
        }
        objectStart = -1;
      }
    }
  }

  return out;
}

export function parseLlmFindings(text: string, files: ChangedFile[]): Finding[] {
  const start = text.indexOf('[');
  if (start === -1) return [];

  const raw = extractJsonObjects(text.slice(start)) as LlmFinding[];
  if (!raw.length) {
    console.error('[pr-review-agent] No parsable findings in the LLM response; discarding it.');
    return [];
  }

  const byPath = new Map(files.map((f) => [f.path, f]));

  return raw
    .filter((f) => {
      // Guards against hallucinated locations by dropping any finding whose file
      // and line are not actually part of the diff.
      const file = byPath.get(f.file);
      if (!file) return false;
      return file.addedLines.has(Number(f.line));
    })
    .slice(0, MAX_FINDINGS === Infinity ? undefined : MAX_FINDINGS)
    .map((f) => ({
      ruleId: `llm/${f.pattern ?? 'review'}`,
      severity: 'info' as const,
      file: f.file,
      line: Number(f.line),
      title: f.title,
      message: f.message,
      suggestion: f.suggestion,
      docs: DOCS.flaky,
      source: 'llm' as const,
    }));
}
