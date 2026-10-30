import { z } from 'zod';

/**
 * One curated "safe to swap in" card, referencing a real export from
 * playwright/support/interfaces/credit_cards/** by name. Curated (not
 * inferred at runtime) so cardFixer never gets handed a card that some other
 * spec deliberately uses to trigger a decline/fraud/manual-review path.
 */
export const CardPoolCardSchema = z.object({
  /** Exact exported name in playwright/support/interfaces/credit_cards, e.g. "mercadopagoMasterCardBrasilSuccessful". */
  variableName: z.string(),
  /** ISO-ish 2-letter country hint, or null if the card isn't country-specific. Soft ranking signal, not a filter. */
  country: z.string().nullable().default(null),
  /** Card brand hint (mastercard/visa/amex/...), or null if unknown. Soft ranking signal, not a filter. */
  brand: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type CardPoolCard = z.infer<typeof CardPoolCardSchema>;

/**
 * One registry file per source credit_cards/*.ts file (see
 * jul-ia-n/knowledge/card-pool/*.json). `psp` is the ranking tag inferred
 * from the filename — cards from any PSP file are eligible pool-wide (a
 * MercadoPago card may well work against Kushki in a sandbox environment);
 * `psp`/`country`/`brand` only affect ordering, never eligibility.
 */
export const CardPoolFileSchema = z.object({
  psp: z.string(),
  cards: z.array(CardPoolCardSchema),
});
export type CardPoolFile = z.infer<typeof CardPoolFileSchema>;
