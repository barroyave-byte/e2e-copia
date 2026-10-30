import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { embed, EMBEDDINGS_MODEL } from '../models';
import { ClassifiedFailure, RootCauseCategory } from '../schemas/classifiedFailure';
import { KnowledgeEntry, KnowledgeEntrySchema } from '../schemas/knowledgeEntry';
import { log } from '../util/log';

const DEFAULT_DB_DIR = join(process.cwd(), 'jul-ia-n', 'knowledge', 'database');
const CACHE_PATH = join(process.cwd(), 'jul-ia-n', 'knowledge', '.embeddings-cache.json');

const DEFAULT_MIN_SIMILARITY = Number(process.env.AI_HEAL_KB_MIN_SIMILARITY || '0.45');
const DEFAULT_TOP_K = Number(process.env.AI_HEAL_KB_TOP_K || '3');
const EXACT_TESTCASE_BOOST = 0.1;

const SHORTCIRCUIT_ENABLED = (process.env.AI_HEAL_KB_SHORTCIRCUIT || 'true') !== 'false';
const SHORTCIRCUIT_THRESHOLD = Number(process.env.AI_HEAL_KB_SC_THRESHOLD || '0.9');
// "known-issue" silently marks the CSV as resolved with no verify step and no
// human ever reviewing it again — a false positive here hides a real bug, so
// it gets its own, stricter threshold than the route/apply tiers above.
const KNOWN_ISSUE_THRESHOLD = Number(
  process.env.AI_HEAL_KB_KNOWN_ISSUE_THRESHOLD || '0.95',
);

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export const loadKnowledgeBase = (dir: string = DEFAULT_DB_DIR): KnowledgeEntry[] => {
  if (!existsSync(dir)) {
    log.debug('knowledge', `db dir does not exist: ${dir}`);
    return [];
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const entries: KnowledgeEntry[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      const entry = KnowledgeEntrySchema.parse(raw);
      if (entry.knownExternalIssue && entry.replayableFix) {
        log.warn('knowledge', `skipping invalid entry ${file}`, {
          error: 'knownExternalIssue and replayableFix are mutually exclusive',
        });
        continue;
      }
      if (entry.status === 'active') entries.push(entry);
    } catch (err) {
      log.warn('knowledge', `skipping invalid entry ${file}`, {
        error: (err as Error).message,
      });
    }
  }
  log.debug('knowledge', `loaded ${entries.length} active entries`, {
    files: files.length,
  });
  return entries;
};

// ---------------------------------------------------------------------------
// Embedding cache (on-disk, keyed by model + symptom hash)
// ---------------------------------------------------------------------------

type EmbeddingCache = Record<string, number[]>;

const hashKey = (text: string): string =>
  createHash('sha256').update(`${EMBEDDINGS_MODEL}:${text}`).digest('hex');

const readCache = (): EmbeddingCache => {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as EmbeddingCache;
  } catch {
    return {};
  }
};

const writeCache = (cache: EmbeddingCache): void => {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf-8');
};

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  similarity: number;
  /** similarity + boosts (used for ranking/threshold). */
  score: number;
  exactTestCaseMatch: boolean;
}

export const cosine = (a: number[], b: number[]): number => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const buildQueryText = (f: ClassifiedFailure): string =>
  [f.testDescription, f.errorIdentified, f.rootCause, f.failedStep].filter(Boolean).join('\n');

/** Ensure every entry has an embedding, using/refreshing the on-disk cache. */
const embedEntries = async (entries: KnowledgeEntry[]): Promise<Map<string, number[]>> => {
  const cache = readCache();
  const byId = new Map<string, number[]>();
  const toEmbed: { id: string; key: string; text: string }[] = [];

  for (const e of entries) {
    const key = hashKey(e.symptom);
    if (cache[key]) {
      byId.set(e.id, cache[key]);
    } else {
      toEmbed.push({ id: e.id, key, text: e.symptom });
    }
  }

  if (toEmbed.length > 0) {
    log.info('knowledge', `embedding ${toEmbed.length} new/changed entries`, {
      model: EMBEDDINGS_MODEL,
    });
    const vectors = await embed(toEmbed.map((t) => t.text));
    toEmbed.forEach((t, i) => {
      cache[t.key] = vectors[i];
      byId.set(t.id, vectors[i]);
    });
    writeCache(cache);
  }

  return byId;
};

export interface LookupOptions {
  dir?: string;
  minSimilarity?: number;
  topK?: number;
}

/**
 * The KB loaded and embedded once per run. The KB is static during a pipeline
 * run, so this is prepared a single time and reused across every leader; the
 * per-leader path (scoreKnowledge) then does only an in-memory cosine — no disk
 * reads, no Zod validation, no network — which also makes it safe to call from a
 * concurrent leader loop.
 */
export interface PreparedKnowledgeBase {
  entries: KnowledgeEntry[];
  entryVectors: Map<string, number[]>;
}

const EMBED_BATCH_SIZE = Math.max(1, Number(process.env.AI_HEAL_EMBED_BATCH_SIZE || '128'));

/**
 * Load the KB and ensure every entry has an embedding (using/refreshing the
 * on-disk cache). Call once per run, before the leader loop. The single cache
 * write here also avoids the concurrent-write race that per-leader embedding
 * would create.
 */
export const prepareKnowledgeBase = async (
  opts: Pick<LookupOptions, 'dir'> = {}
): Promise<PreparedKnowledgeBase> => {
  const entries = loadKnowledgeBase(opts.dir);
  if (entries.length === 0) return { entries: [], entryVectors: new Map() };
  const entryVectors = await embedEntries(entries);
  return { entries, entryVectors };
};

/**
 * Embed every leader's query text up front in a few batched calls instead of
 * one network round-trip per leader. Returns testCaseId -> query vector.
 */
export const embedQueries = async (
  failures: ClassifiedFailure[]
): Promise<Map<string, number[]>> => {
  const byId = new Map<string, number[]>();
  if (failures.length === 0) return byId;
  for (let i = 0; i < failures.length; i += EMBED_BATCH_SIZE) {
    const chunk = failures.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embed(chunk.map((f) => buildQueryText(f)));
    chunk.forEach((f, j) => byId.set(f.testCaseId, vectors[j]));
  }
  log.debug('knowledge', `embedded ${byId.size} query vectors`, {
    batches: Math.ceil(failures.length / EMBED_BATCH_SIZE),
  });
  return byId;
};

/**
 * Score a single failure against the prepared KB. Pure and synchronous (no I/O,
 * no network) so it is safe to call inside a concurrent leader loop. Returns
 * ranked matches above the similarity threshold, or an empty array if the KB is
 * empty or no entry clears the threshold.
 */
export const scoreKnowledge = (
  failure: ClassifiedFailure,
  queryVec: number[],
  prepared: PreparedKnowledgeBase,
  opts: Pick<LookupOptions, 'minSimilarity' | 'topK'> = {}
): KnowledgeMatch[] => {
  if (prepared.entries.length === 0) return [];

  const minSimilarity = opts.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const topK = opts.topK ?? DEFAULT_TOP_K;

  const matches: KnowledgeMatch[] = [];
  for (const entry of prepared.entries) {
    const vec = prepared.entryVectors.get(entry.id);
    if (!vec) continue;
    const similarity = cosine(queryVec, vec);
    const exactTestCaseMatch = entry.testCaseIds.includes(failure.testCaseId);
    const score = Math.min(1, similarity + (exactTestCaseMatch ? EXACT_TESTCASE_BOOST : 0));
    if (score >= minSimilarity) {
      matches.push({ entry, similarity, score, exactTestCaseMatch });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, topK);

  log.decision(
    'knowledge',
    top.length > 0 ? `${top.length} match(es)` : 'no match',
    `query=${failure.testCaseId} (minSim=${minSimilarity})`,
    {
      testCaseId: failure.testCaseId,
      top: top.map((m) => ({
        id: m.entry.id,
        score: Number(m.score.toFixed(3)),
        exact: m.exactTestCaseMatch,
      })),
    }
  );

  return top;
};

/**
 * Convenience one-shot lookup: load + embed entries + embed query + score.
 * Used by the eval/bench tooling. The pipeline instead calls
 * prepareKnowledgeBase + embedQueries once and scoreKnowledge per leader, so it
 * never repeats the load/embed work. Never throws on an empty KB; embedding
 * errors propagate (caller decides whether to continue without KB).
 */
export const lookupKnowledge = async (
  failure: ClassifiedFailure,
  opts: LookupOptions = {}
): Promise<KnowledgeMatch[]> => {
  const prepared = await prepareKnowledgeBase(opts);
  if (prepared.entries.length === 0) return [];
  const queryVectors = await embedQueries([failure]);
  const queryVec = queryVectors.get(failure.testCaseId);
  if (!queryVec) return [];
  return scoreKnowledge(failure, queryVec, prepared, opts);
};

// ---------------------------------------------------------------------------
// Tiered short-circuit decision
// ---------------------------------------------------------------------------

export type ShortCircuitTier = 'none' | 'route' | 'apply' | 'known-issue';

export interface ShortCircuitDecision {
  tier: ShortCircuitTier;
  /** The match that triggered the short-circuit (present when tier !== 'none'). */
  match?: KnowledgeMatch;
  reason: string;
}

/**
 * Decide whether a KB match is strong enough to bypass LLM reasoning:
 * - 'known-issue' : score≥KNOWN_ISSUE_THRESHOLD + exact testCase match + entry
 *                   has knownExternalIssue (+ category agrees, if the entry sets
 *                   one) → skip orchestrator, subagent, AND verify. Nothing is
 *                   fixed or re-run; the CSV is marked directly. Its own,
 *                   stricter threshold exists because there is no verify safety
 *                   net here — a false positive silently hides a real failure.
 * - 'apply'       : score≥SC threshold + exact testCase match + entry has
 *                   replayableFix + subagentHint → skip orchestrator AND
 *                   subagent (verify still runs).
 * - 'route'       : score≥SC threshold + exact testCase match + subagentHint →
 *                   skip the orchestrator only; subagent still reasons.
 * - 'none'        : fall back to normal flow (advisory injection happens
 *                   separately).
 *
 * The exact-testCaseId requirement is deliberate: short-circuit only fires on a
 * proven recurrence of the SAME test, not on a fuzzy semantic neighbour.
 */
export const decideShortCircuit = (
  matches: KnowledgeMatch[],
  currentCategory: RootCauseCategory,
): ShortCircuitDecision => {
  if (!SHORTCIRCUIT_ENABLED) return { tier: 'none', reason: 'disabled' };
  const top = matches[0];
  if (!top) return { tier: 'none', reason: 'no match' };
  if (!top.exactTestCaseMatch) return { tier: 'none', reason: 'no exact testCaseId match' };

  if (top.entry.knownExternalIssue) {
    if (top.score < KNOWN_ISSUE_THRESHOLD) {
      return {
        tier: 'none',
        reason: `score ${top.score.toFixed(2)} < known-issue threshold ${KNOWN_ISSUE_THRESHOLD}`,
      };
    }
    if (top.entry.rootCauseCategory && top.entry.rootCauseCategory !== currentCategory) {
      return {
        tier: 'none',
        reason: `category mismatch: entry=${top.entry.rootCauseCategory}, current=${currentCategory} (refusing to short-circuit a possibly-different bug)`,
      };
    }
    return { tier: 'known-issue', match: top, reason: 'known external/PSP issue, no fix on our side' };
  }

  if (top.score < SHORTCIRCUIT_THRESHOLD)
    return {
      tier: 'none',
      reason: `score ${top.score.toFixed(2)} < SC threshold ${SHORTCIRCUIT_THRESHOLD}`,
    };
  if (!top.entry.subagentHint) return { tier: 'none', reason: 'entry has no subagentHint' };
  if (top.entry.replayableFix && top.entry.replayableFix.length > 0) {
    return { tier: 'apply', match: top, reason: 'replayableFix present' };
  }
  return { tier: 'route', match: top, reason: 'subagentHint present' };
};

// ---------------------------------------------------------------------------
// Advisory formatting (injected into orchestrator + subagent input)
// ---------------------------------------------------------------------------

export const formatKnowledgeSection = (matches: KnowledgeMatch[]): string => {
  if (matches.length === 0) return '';
  const lines = [
    '## Known resolutions (knowledge base — ADVISORY, verify before trusting)',
    'Similar failures were resolved before. Treat as prior art, NOT ground truth:',
    '⚠️ The same symptom can have a DIFFERENT root cause now. Confirm against the current evidence before reusing a recipe.',
    '',
  ];
  for (const m of matches) {
    lines.push(
      `### ${m.entry.title}  (similarity=${m.similarity.toFixed(2)}${m.exactTestCaseMatch ? ', exact testCase match' : ''})`
    );
    lines.push(`- symptom: ${m.entry.symptom}`);
    lines.push(`- recipe: ${m.entry.recipe}`);
    if (m.entry.rootCauseCategory) lines.push(`- category: ${m.entry.rootCauseCategory}`);
    if (m.entry.subagentHint) lines.push(`- usual subagent: ${m.entry.subagentHint}`);
    if (m.entry.prRefs.length > 0) lines.push(`- prior PRs/commits: ${m.entry.prRefs.join(', ')}`);
    if (m.entry.lastConfirmedRelease)
      lines.push(`- last confirmed: ${m.entry.lastConfirmedRelease}`);
    lines.push('');
  }
  return lines.join('\n');
};
