import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import * as creditCardData from '../../playwright/support/interfaces/credit_cards';
import { BaseCreditCard } from '../../playwright/support/interfaces/credit_cards/baseCreditCard';
import { CardPoolFileSchema } from '../schemas/cardPoolEntry';
import { log } from '../util/log';

/**
 * A card from the curated pool (jul-ia-n/knowledge/card-pool/*.json), resolved
 * against the real exported constant in playwright/support/interfaces/credit_cards.
 *
 * `psp`/`country`/`brand` are RANKING hints, not filters — sandbox PSP
 * environments are loose enough that a card curated for one PSP regularly
 * works against another, so cardFixer is never hard-blocked from trying it.
 * There is deliberately no "declined"/"used" state here: a card that fails
 * verification today may just be a transient PSP sandbox issue and is fully
 * eligible again on the next run (see PIPELINE.md).
 */
export interface PooledCard extends BaseCreditCard {
  variableName: string;
  psp: string;
  country: string | null;
  brand: string | null;
}

const REGISTRY_DIR = join(__dirname, '..', 'knowledge', 'card-pool');

let _poolCache: PooledCard[] | null = null;

const isCardShaped = (value: unknown): value is BaseCreditCard =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).number === 'string' &&
      typeof (value as Record<string, unknown>).cvv_code === 'string',
  );

const loadPool = (): PooledCard[] => {
  if (_poolCache) return _poolCache;
  if (!existsSync(REGISTRY_DIR)) {
    log.warn('cardPool', `registry dir does not exist: ${REGISTRY_DIR}`);
    _poolCache = [];
    return _poolCache;
  }

  const files = readdirSync(REGISTRY_DIR).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_'),
  );
  const resolved: PooledCard[] = [];
  const cardExports = creditCardData as unknown as Record<string, unknown>;

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(REGISTRY_DIR, file), 'utf-8'));
      const parsed = CardPoolFileSchema.parse(raw);
      for (const card of parsed.cards) {
        const value = cardExports[card.variableName];
        if (!isCardShaped(value)) {
          log.warn(
            'cardPool',
            `registry entry references unknown/invalid export ${card.variableName}`,
            { file },
          );
          continue;
        }
        resolved.push({
          ...value,
          variableName: card.variableName,
          psp: parsed.psp,
          country: card.country,
          brand: card.brand,
        });
      }
    } catch (err) {
      log.warn('cardPool', `skipping invalid registry file ${file}`, {
        error: (err as Error).message,
      });
    }
  }

  log.debug('cardPool', `loaded ${resolved.length} cards from ${files.length} registry files`);
  _poolCache = resolved;
  return resolved;
};

export interface GetCardCandidatesOptions {
  /** Ranking hint (the PSP of the failing test). Not a filter — see PooledCard docs. */
  psp?: string;
  /** Ranking hint. Not a filter. */
  country?: string;
  /** Ranking hint. Not a filter. */
  brand?: string;
  /** variableNames to leave out — e.g. cards already tried earlier in this same case's retry loop. */
  exclude?: string[];
}

/**
 * +3 same psp & same country, +2 same psp (any country), +1 same brand,
 * 0 otherwise. Ties keep the registry's natural (file) order. This is a soft
 * ranking, never a hard filter — a fully mismatched card still comes back at
 * the end of the list rather than being dropped, since sandbox PSP
 * environments frequently accept cards curated for a different PSP.
 */
const scoreCard = (card: PooledCard, opts: GetCardCandidatesOptions): number => {
  let score = 0;
  if (opts.psp && card.psp.toLowerCase() === opts.psp.toLowerCase()) {
    score += card.country && opts.country && card.country.toLowerCase() === opts.country.toLowerCase()
      ? 3
      : 2;
  }
  if (opts.brand && card.brand && card.brand.toLowerCase() === opts.brand.toLowerCase()) {
    score += 1;
  }
  return score;
};

export const getCardCandidates = (opts: GetCardCandidatesOptions = {}): PooledCard[] => {
  const excluded = new Set((opts.exclude ?? []).map((n) => n.toLowerCase()));
  return loadPool()
    .filter((c) => !excluded.has(c.variableName.toLowerCase()))
    .map((card, index) => ({ card, index, score: scoreCard(card, opts) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.card);
};
