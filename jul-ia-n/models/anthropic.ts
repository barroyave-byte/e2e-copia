import Anthropic, { APIError } from '@anthropic-ai/sdk';

import { log } from '../util/log';
import { logGeneration } from '../util/tracing';
import {
  AgentOptions,
  AgentResult,
  AgentTool,
  AgentToolCallRecord,
  StructuredOutputOptions,
  StructuredOutputResult,
  StructuredOutputUsage,
} from './types';

export const ANTHROPIC_MODEL_CLASSIFY = process.env.ANTHROPIC_MODEL_CLASSIFY || 'claude-sonnet-4-6';
export const ANTHROPIC_MODEL_REASONING =
  process.env.ANTHROPIC_MODEL_REASONING || 'claude-sonnet-4-6';

let _anthropicInstance: Anthropic | null = null;
export const anthropicInstance = (): Anthropic => {
  if (!_anthropicInstance) {
    _anthropicInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropicInstance;
};

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
};

const schemaAllowsNull = (schema: JsonSchema | undefined): boolean => {
  if (!schema) return false;
  if (schema.type === 'null') return true;
  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  return (
    (schema.anyOf?.some(schemaAllowsNull) ?? false) ||
    (schema.oneOf?.some(schemaAllowsNull) ?? false) ||
    (schema.allOf?.some(schemaAllowsNull) ?? false)
  );
};

/**
 * Anthropic tool-use occasionally emits the literal string "null" for a field
 * the schema marks nullable, instead of JSON null. Walk the tool input against
 * its JSON schema and coerce those sentinels back to real null, so downstream
 * Zod validation (which expects `null | enum`) does not reject them. Conservative
 * on purpose: only the exact string "null" on a field whose schema actually
 * allows null is coerced; every other value passes through untouched.
 */
const coerceNullSentinels = (value: unknown, schema: JsonSchema | undefined): unknown => {
  if (!schema) return value;
  if (
    typeof value === 'string' &&
    value.trim().toLowerCase() === 'null' &&
    schemaAllowsNull(schema)
  ) {
    return null;
  }
  if (Array.isArray(value)) {
    return schema.items ? value.map((v) => coerceNullSentinels(v, schema.items)) : value;
  }
  if (value && typeof value === 'object' && schema.properties) {
    const props = schema.properties;
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(out)) {
      if (props[key]) out[key] = coerceNullSentinels(out[key], props[key]);
    }
    return out;
  }
  return value;
};

export const getStructuredOutput = async <T>(
  opts: StructuredOutputOptions
): Promise<StructuredOutputResult<T>> => {
  const model = opts.model || ANTHROPIC_MODEL_CLASSIFY;

  // Stream and accumulate via finalMessage(): the Anthropic SDK rejects a
  // NON-streaming request whose max_tokens implies a possible >10-minute
  // generation ("Streaming is required..."). Streaming avoids that and the HTTP
  // timeout it guards against. finalMessage() returns the same assembled Message
  // (content + usage + stop_reason), so the tool_use extraction below is unchanged.
  const response = await anthropicInstance()
    .messages.stream({
      model,
      max_tokens: opts.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0,
      system: [
        {
          type: 'text',
          text: opts.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: opts.toolName,
          description: opts.toolDescription,
          input_schema: opts.inputSchema as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: opts.toolName },
      messages: [{ role: 'user', content: opts.userInput }],
    })
    .finalMessage();

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error(
      `Model ${model} did not return a tool_use block (stop_reason=${response.stop_reason})`
    );
  }

  const data = coerceNullSentinels(toolUse.input, opts.inputSchema as JsonSchema) as T;
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? undefined,
  };
  await logGeneration({
    name: opts.toolName,
    provider: 'anthropic',
    model: response.model,
    input: opts.userInput,
    output: data,
    usage,
  });
  return {
    data,
    usage,
    stopReason: response.stop_reason,
    model: response.model,
    provider: 'anthropic',
  };
};

const argsPreview = (args: unknown): string => {
  const s = typeof args === 'string' ? args : JSON.stringify(args ?? {});
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
};

const addUsage = (acc: StructuredOutputUsage, u: Anthropic.Usage): StructuredOutputUsage => ({
  inputTokens: (acc.inputTokens ?? 0) + u.input_tokens,
  outputTokens: (acc.outputTokens ?? 0) + u.output_tokens,
  cacheReadTokens: (acc.cacheReadTokens ?? 0) + (u.cache_read_input_tokens ?? 0),
  cacheCreationTokens: (acc.cacheCreationTokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
});

/**
 * Multi-turn tool-use loop. The model may call any of `tools` (read-only)
 * zero or more times; the loop ends when it calls `submitTool`. On the last
 * allowed iteration we force `submitTool` so the loop always terminates.
 */
export const runAgent = async <T>(opts: AgentOptions): Promise<AgentResult<T>> => {
  const model = opts.model || ANTHROPIC_MODEL_REASONING;
  const maxIterations = opts.maxIterations ?? 6;
  const toolByName = new Map<string, AgentTool>(opts.tools.map((t) => [t.name, t]));

  const tools: Anthropic.Tool[] = [
    ...opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    })),
    {
      name: opts.submitTool.name,
      description: opts.submitTool.description,
      input_schema: opts.submitTool.inputSchema as Anthropic.Tool['input_schema'],
    },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.userInput }];
  let usage: StructuredOutputUsage = {};
  const toolCalls: AgentToolCallRecord[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const forceSubmit = iteration === maxIterations;
    const response = await anthropicInstance().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 8000,
      temperature: opts.temperature ?? 0,
      system: [
        {
          type: 'text',
          text: opts.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools,
      tool_choice: forceSubmit ? { type: 'tool', name: opts.submitTool.name } : { type: 'any' },
      messages,
    });
    usage = addUsage(usage, response.usage);

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (toolUses.length === 0) {
      throw new Error(
        `Agent model ${model} returned no tool_use (stop_reason=${response.stop_reason}) on iteration ${iteration}`
      );
    }

    const submit = toolUses.find((b) => b.name === opts.submitTool.name);
    if (submit) {
      toolCalls.push({
        iteration,
        name: submit.name,
        ok: true,
        argsPreview: argsPreview(submit.input),
      });
      const data = coerceNullSentinels(submit.input, opts.submitTool.inputSchema as JsonSchema) as T;
      await logGeneration({
        name: 'agent:' + opts.submitTool.name,
        provider: 'anthropic',
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
        provider: 'anthropic',
        iterations: iteration,
        toolCalls,
      };
    }

    // Execute the read-only tools and feed results back.
    messages.push({ role: 'assistant', content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const tool = toolByName.get(tu.name);
      if (!tool) {
        results.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: `Unknown tool "${tu.name}".`,
          is_error: true,
        });
        toolCalls.push({
          iteration,
          name: tu.name,
          ok: false,
          argsPreview: argsPreview(tu.input),
        });
        continue;
      }
      let out: string;
      let ok = true;
      try {
        out = await tool.execute(tu.input as Record<string, unknown>);
      } catch (err) {
        ok = false;
        out = `[tool error] ${(err as Error).message}`;
      }
      log.debug('agent', `tool ${tu.name}`, {
        iteration,
        ok,
        args: argsPreview(tu.input),
        resultChars: out.length,
      });
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: out,
        is_error: !ok,
      });
      toolCalls.push({
        iteration,
        name: tu.name,
        ok,
        argsPreview: argsPreview(tu.input),
      });
    }
    messages.push({ role: 'user', content: results });
  }

  throw new Error(`Agent model ${model} did not submit within ${maxIterations} iterations`);
};

export const isAnthropicError = (err: unknown): err is APIError => err instanceof APIError;
