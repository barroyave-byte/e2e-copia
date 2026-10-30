export type AiProvider = 'anthropic' | 'openai';

/**
 * OpenAI reasoning-effort levels (models/openai.ts only — Anthropic has no
 * equivalent knob and ignores this field). 'none' fully disables reasoning;
 * only gpt-5.1+ models support it.
 */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface StructuredOutputOptions {
  model?: string;
  systemPrompt: string;
  userInput: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
}

export interface StructuredOutputUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface StructuredOutputResult<T> {
  data: T;
  usage: StructuredOutputUsage;
  stopReason: string | null;
  model: string;
  provider: AiProvider;
}

/**
 * A read-only tool the agent can call during its reasoning loop. `execute`
 * receives the parsed arguments and returns a string that is fed back to the
 * model as the tool result. Errors should be caught and returned as a string
 * (the loop never throws on a tool failure — it lets the model react).
 */
export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/** Definition of the terminal tool that ends the loop with the final result. */
export interface AgentSubmitTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentOptions {
  model?: string;
  systemPrompt: string;
  userInput: string;
  /** Read-only tools the agent may call zero or more times before submitting. */
  tools: AgentTool[];
  /** Terminal tool — when the model calls it, the loop ends and returns its input. */
  submitTool: AgentSubmitTool;
  /** Max model turns before we force the submit tool. Default 6. */
  maxIterations?: number;
  maxTokens?: number;
  temperature?: number;
  /** OpenAI only (models/openai.ts) — see OPENAI_AGENT_REASONING_EFFORT for the default. */
  reasoningEffort?: ReasoningEffort;
}

export interface AgentToolCallRecord {
  iteration: number;
  name: string;
  ok: boolean;
  argsPreview: string;
}

export interface AgentResult<T> {
  data: T;
  usage: StructuredOutputUsage;
  model: string;
  provider: AiProvider;
  iterations: number;
  toolCalls: AgentToolCallRecord[];
}
