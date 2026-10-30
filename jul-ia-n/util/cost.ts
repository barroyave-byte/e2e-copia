export interface PriceTier {
  inputPerM: number;
  outputPerM: number;
}

export interface UsageRecord {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

// Per developers.openai.com/api/docs/models (checked 2026-07-23). Longest/most
// specific keys must come before shorter prefixes they'd otherwise shadow in
// lookupPricing's startsWith scan (e.g. 'gpt-5.6-terra' before a bare 'gpt-5.6').
const PRICING: Record<string, PriceTier> = {
  'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
  'claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15 },
  'gpt-5.6-sol': { inputPerM: 5, outputPerM: 30 },
  'gpt-5.6-terra': { inputPerM: 2.5, outputPerM: 15 },
  'gpt-5.6-luna': { inputPerM: 1, outputPerM: 6 },
  'gpt-5.2': { inputPerM: 3, outputPerM: 15 },
};

export const lookupPricing = (model: string): PriceTier => {
  for (const key of Object.keys(PRICING)) {
    if (model.startsWith(key)) return PRICING[key];
  }
  return { inputPerM: 3, outputPerM: 15 };
};

export const estimateCostUsd = (model: string, usage: UsageRecord): number => {
  const tier = lookupPricing(model);
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return (input / 1_000_000) * tier.inputPerM + (output / 1_000_000) * tier.outputPerM;
};
