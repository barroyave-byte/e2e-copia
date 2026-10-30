import OpenAI, { APIError } from 'openai';

import { log } from '../util/log';
import { logGeneration } from '../util/tracing';
import {
  AgentOptions,
  AgentResult,
  AgentTool,
  AgentToolCallRecord,
  ReasoningEffort,
  StructuredOutputOptions,
  StructuredOutputResult,
  StructuredOutputUsage,
} from './types';

// Classify is a repetitive structured-output task over already-normalized,
// single-line failure blocks — it doesn't need a frontier reasoning model.
// gpt-5.6-luna (cost-optimized tier) + low reasoning effort (see
// getStructuredOutput) cuts hidden reasoning-token latency, which is what
// pushed a 308-failure single-shot classify call past its timeout.
export const OPENAI_MODEL_CLASSIFY =
  process.env.OPENAI_MODEL_CLASSIFY || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
// Orchestrator + agentic subagents (assertFixer/cardFixer/serviceInvestigator/
// testDataFixer) read real repo files in a multi-turn tool loop and produce
// diffs that gate real PRs/Issues via verify — gpt-5.6-terra balances that
// reasoning depth against cost better than the frontier gpt-5.6-sol tier.
export const OPENAI_MODEL_REASONING =
  process.env.OPENAI_MODEL_REASONING || process.env.OPENAI_MODEL || 'gpt-5.6-terra';
// runAgent's tool loop (see below) always passes function tools, and gpt-5.6
// only supports function tools + real reasoning together on the Responses
// API — not on /v1/chat/completions, which 400s outright. 'medium' restores
// genuine reasoning for the diffs that gate real PRs (assertFixer/cardFixer/
// serviceInvestigator/testDataFixer); raise to 'high' via env if warranted
// after seeing cost/latency in production.
export const OPENAI_AGENT_REASONING_EFFORT = (process.env.AI_HEAL_AGENT_REASONING_EFFORT ||
  'medium') as ReasoningEffort;
export const OPENAI_EMBEDDINGS_MODEL =
  process.env.AI_HEAL_EMBEDDINGS_MODEL || 'text-embedding-3-small';

// Default SDK timeout is 10 min/attempt with 2 retries. A large, non-streaming
// structured-output call (e.g. classifying 300+ failures in one shot) generates
// a huge JSON output that can exceed 10 min, so the client aborts with
// "Request timed out.". Until classify is chunked (v2), allow overriding the
// per-attempt timeout, and cap retries so a slow run doesn't get tripled.
const OPENAI_TIMEOUT_MS = Number(
  process.env.AI_HEAL_OPENAI_TIMEOUT_MS || 30 * 60 * 1000, // 30 min
);
const OPENAI_MAX_RETRIES = Number(process.env.AI_HEAL_OPENAI_MAX_RETRIES || 1);

let _openAiInstance: OpenAI | null = null;
export const openAiInstance = (): OpenAI => {
  if (!_openAiInstance) {
    _openAiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: OPENAI_MAX_RETRIES,
    });
  }
  return _openAiInstance;
};

export const getStructuredOutput = async <T>(
  opts: StructuredOutputOptions,
): Promise<StructuredOutputResult<T>> => {
  const model = opts.model || OPENAI_MODEL_CLASSIFY;

  const response = await openAiInstance().chat.completions.create({
    model,
    // No `temperature` — the gpt-5.x reasoning family (our only OpenAI models)
    // rejects any value other than the default (1): "400 Unsupported value:
    // 'temperature' does not support 0 with this model." opts.temperature is
    // still honored on the Anthropic side (models/anthropic.ts).
    //max_tokens: opts.maxTokens ?? 16000,
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userInput },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: opts.toolName,
        description: opts.toolDescription,
        strict: true,
        schema: opts.inputSchema,
      },
    },
  });

  const choice = response.choices[0];
  const content = choice?.message?.content?.trim();
  if (!content) {
    throw new Error(
      `Model ${model} returned empty content (finish_reason=${choice?.finish_reason})`,
    );
  }

  let data: T;
  try {
    data = JSON.parse(content) as T;
  } catch (err) {
    throw new Error(
      `Model ${model} returned invalid JSON: ${(err as Error).message}`,
    );
  }

  const usage = response.usage;
  const result: StructuredOutputResult<T> = {
    data,
    usage: {
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      cacheReadTokens: usage?.prompt_tokens_details?.cached_tokens ?? undefined,
    },
    stopReason: choice?.finish_reason ?? null,
    model: response.model,
    provider: 'openai',
  };
  await logGeneration({
    name: opts.toolName,
    provider: 'openai',
    model: result.model,
    input: opts.userInput,
    output: data,
    usage: result.usage,
  });
  return result;
};

const argsPreview = (args: unknown): string => {
  const s = typeof args === 'string' ? args : JSON.stringify(args ?? {});
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
};

const addUsage = (
  acc: StructuredOutputUsage,
  u: OpenAI.CompletionUsage | undefined,
): StructuredOutputUsage => ({
  inputTokens: (acc.inputTokens ?? 0) + (u?.prompt_tokens ?? 0),
  outputTokens: (acc.outputTokens ?? 0) + (u?.completion_tokens ?? 0),
  cacheReadTokens:
    (acc.cacheReadTokens ?? 0) + (u?.prompt_tokens_details?.cached_tokens ?? 0),
});

const addResponsesUsage = (
  acc: StructuredOutputUsage,
  u: OpenAI.Responses.ResponseUsage | undefined,
): StructuredOutputUsage => ({
  inputTokens: (acc.inputTokens ?? 0) + (u?.input_tokens ?? 0),
  outputTokens: (acc.outputTokens ?? 0) + (u?.output_tokens ?? 0),
  cacheReadTokens:
    (acc.cacheReadTokens ?? 0) + (u?.input_tokens_details?.cached_tokens ?? 0),
});

/**
 * Multi-turn function-calling loop, on the Responses API (not Chat
 * Completions — gpt-5.6 400s on function tools + reasoning together there;
 * "Function tools with reasoning_effort are not supported ... use /v1/responses").
 * Mirrors anthropic.runAgent: the model may call any read-only tool zero or
 * more times; the loop ends when it calls `submitTool`. On the last allowed
 * iteration we force `submitTool`. Chains turns via `previous_response_id`
 * instead of resending the transcript, which is the Responses-native pattern.
 */
export const runAgent = async <T>(
  opts: AgentOptions,
): Promise<AgentResult<T>> => {
  const model = opts.model || OPENAI_MODEL_REASONING;
  const maxIterations = opts.maxIterations ?? 6;
  const toolByName = new Map<string, AgentTool>(
    opts.tools.map((t) => [t.name, t]),
  );

  const tools: OpenAI.Responses.Tool[] = [
    ...opts.tools.map((t) => ({
      type: 'function' as const,
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
      strict: false,
    })),
    {
      type: 'function' as const,
      name: opts.submitTool.name,
      description: opts.submitTool.description,
      parameters: opts.submitTool.inputSchema,
      strict: true,
    },
  ];

  let usage: StructuredOutputUsage = {};
  const toolCalls: AgentToolCallRecord[] = [];
  let previousResponseId: string | undefined;
  let nextInput: string | OpenAI.Responses.ResponseInputItem[] = opts.userInput;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const forceSubmit = iteration === maxIterations;
    const response = await openAiInstance().responses.create({
      model,
      // instructions aren't carried over via previous_response_id — resend every turn.
      instructions: opts.systemPrompt,
      input: nextInput,
      previous_response_id: previousResponseId,
      reasoning: { effort: opts.reasoningEffort ?? OPENAI_AGENT_REASONING_EFFORT },
      max_output_tokens: opts.maxTokens,
      tools,
      tool_choice: forceSubmit
        ? { type: 'function', name: opts.submitTool.name }
        : 'required',
    });
    usage = addResponsesUsage(usage, response.usage);
    previousResponseId = response.id;

    const calls = response.output.filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
        item.type === 'function_call',
    );
    if (calls.length === 0) {
      throw new Error(
        `Agent model ${model} returned no function_call items (status=${response.status ?? 'n/a'}) on iteration ${iteration}`,
      );
    }

    const submit = calls.find((c) => c.name === opts.submitTool.name);
    if (submit) {
      toolCalls.push({
        iteration,
        name: submit.name,
        ok: true,
        argsPreview: argsPreview(submit.arguments),
      });
      let data: T;
      try {
        data = JSON.parse(submit.arguments) as T;
      } catch (err) {
        throw new Error(
          `Agent model ${model} submit returned invalid JSON: ${(err as Error).message}`,
        );
      }
      await logGeneration({
        name: 'agent:' + opts.submitTool.name,
        provider: 'openai',
        model: response.model,
        input: opts.userInput,
        output: data,
        usage,
        metadata: {
          iterations: iteration,
          toolCalls: toolCalls.map((c) => `${c.name}${c.ok ? '' : ' (error)'}`),
        },
      });
      return {
        data,
        usage,
        model: response.model,
        provider: 'openai',
        iterations: iteration,
        toolCalls,
      };
    }

    // Answer every read-only tool call; their outputs become next turn's input.
    const outputs: OpenAI.Responses.ResponseInputItem[] = [];
    for (const call of calls) {
      const tool = toolByName.get(call.name);
      let out: string;
      let ok = true;
      if (!tool) {
        ok = false;
        out = `Unknown tool "${call.name}".`;
      } else {
        try {
          const args = call.arguments
            ? (JSON.parse(call.arguments) as Record<string, unknown>)
            : {};
          out = await tool.execute(args);
        } catch (err) {
          ok = false;
          out = `[tool error] ${(err as Error).message}`;
        }
      }
      log.debug('agent', `tool ${call.name}`, {
        iteration,
        ok,
        args: argsPreview(call.arguments),
        resultChars: out.length,
      });
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: out,
      });
      toolCalls.push({
        iteration,
        name: call.name,
        ok,
        argsPreview: argsPreview(call.arguments),
      });
    }
    nextInput = outputs;
  }

  throw new Error(
    `Agent model ${model} did not submit within ${maxIterations} iterations`,
  );
};

/**
 * Embed texts with OpenAI embeddings. Used by the knowledge base (semantic
 * match). Independent of AI_PROVIDER — Anthropic has no first-party embeddings
 * API, so the KB always uses OpenAI embeddings (requires OPENAI_API_KEY).
 */
export const embed = async (texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) return [];
  const resp = await openAiInstance().embeddings.create({
    model: OPENAI_EMBEDDINGS_MODEL,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
};

export const isOpenAiError = (err: unknown): err is APIError =>
  err instanceof APIError;
