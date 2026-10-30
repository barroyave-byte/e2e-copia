import * as anthropic from './anthropic';
import * as openai from './openai';
import {
  AgentOptions,
  AgentResult,
  AiProvider,
  StructuredOutputOptions,
  StructuredOutputResult,
} from './types';

const resolveProvider = (): AiProvider => {
  const raw = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (raw !== 'anthropic' && raw !== 'openai') {
    throw new Error(
      `Invalid AI_PROVIDER="${process.env.AI_PROVIDER}". Expected "anthropic" or "openai".`,
    );
  }
  return raw;
};

export const AI_PROVIDER: AiProvider = resolveProvider();

export const MODEL_CLASSIFY =
  AI_PROVIDER === 'anthropic'
    ? anthropic.ANTHROPIC_MODEL_CLASSIFY
    : openai.OPENAI_MODEL_CLASSIFY;

export const MODEL_REASONING =
  AI_PROVIDER === 'anthropic'
    ? anthropic.ANTHROPIC_MODEL_REASONING
    : openai.OPENAI_MODEL_REASONING;

export const getStructuredOutput = <T>(
  opts: StructuredOutputOptions,
): Promise<StructuredOutputResult<T>> =>
  AI_PROVIDER === 'anthropic'
    ? anthropic.getStructuredOutput<T>(opts)
    : openai.getStructuredOutput<T>(opts);

export const runAgent = <T>(opts: AgentOptions): Promise<AgentResult<T>> =>
  AI_PROVIDER === 'anthropic'
    ? anthropic.runAgent<T>(opts)
    : openai.runAgent<T>(opts);

/**
 * Embeddings for the knowledge base. Always OpenAI (Anthropic has no first-party
 * embeddings API), regardless of AI_PROVIDER. Requires OPENAI_API_KEY.
 */
export const EMBEDDINGS_MODEL = openai.OPENAI_EMBEDDINGS_MODEL;
export const embed = (texts: string[]): Promise<number[][]> =>
  openai.embed(texts);

export type {
  AgentOptions,
  AgentResult,
  AgentTool,
  AgentToolCallRecord,
  AiProvider,
  ReasoningEffort,
  StructuredOutputOptions,
  StructuredOutputResult,
} from './types';
