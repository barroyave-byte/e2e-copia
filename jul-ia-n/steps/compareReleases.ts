import { createReadStream, existsSync, readdirSync } from 'fs';
import { basename, join } from 'path';
import csv = require('csv-parser');

import { embed } from '../models';
import { log } from '../util/log';
import { hasAiHealMarker, withAiHealMarker } from './aiHealMarker';
import { CSV_HEADERS, toCsvRow, writeCsvAtomic } from './csv';
import { cosine } from './knowledge';

/**
 * Cross-release comparison: for every row in a freshly generated release CSV,
 * looks for the same testCaseId among the PREVIOUS release's REVIEWED rows
 * (QA Review + Root cause QA both filled in by QA/dev) and, if the failure
 * text is similar enough, marks it reiterative and copies the disposition
 * forward — replacing the manual "attach both CSVs to a prompt" step.
 *
 * The reviewed baseline lives in jul-ia-n/releases/ — one file per release,
 * committed manually once QA/dev finish reviewing it (see PIPELINE.md).
 * Used both by heal.ts (automatically, via findLatestReleaseCsv) and by
 * tools/compareReleases.ts (manual CLI run).
 */

export const RELEASES_DIR = join(__dirname, '..', 'releases');

// Filenames must embed a "<YYYY>-<major>.<minor>" release number somewhere
// (e.g. "Test Results Release 2026-30.2 - Template.csv" -> year 2026,
// release 30.2). Picking "latest" by numeric (year, major, minor) comparison
// — NOT plain filename string sort — because release numbers don't have a
// fixed digit width: "30.10" is newer than "30.2" but sorts before it as a
// string. mtime isn't an option either: a fresh git checkout (CI) resets
// mtimes for every file, so "most recently modified" is meaningless there.
const RELEASE_NUMBER = /(\d{4})-(\d+)\.(\d+)/;

interface ParsedRelease {
  year: number;
  major: number;
  minor: number;
}

const parseRelease = (filename: string): ParsedRelease | null => {
  const m = filename.match(RELEASE_NUMBER);
  if (!m) return null;
  return { year: Number(m[1]), major: Number(m[2]), minor: Number(m[3]) };
};

const compareParsedReleases = (a: ParsedRelease, b: ParsedRelease): number =>
  a.year - b.year || a.major - b.major || a.minor - b.minor;

/**
 * Picks the most recent reviewed release CSV from jul-ia-n/releases/ (or a
 * custom dir), by the release number embedded in each filename. Returns null
 * if the dir doesn't exist or has no .csv files — the caller treats that as
 * "no baseline available yet", not an error.
 */
export const findLatestReleaseCsv = (dir: string = RELEASES_DIR): string | null => {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith('.csv'));
  if (files.length === 0) return null;

  const parsed = files
    .map((f) => ({ file: f, release: parseRelease(f) }))
    .filter((x): x is { file: string; release: ParsedRelease } => x.release !== null);

  const malformed = files.filter((f) => parseRelease(f) === null);
  if (malformed.length > 0) {
    log.warn(
      'compareReleases',
      `${malformed.length} file(s) in ${dir} don't have a recognizable <YYYY>-<major>.<minor> ` +
        `release number in their filename and were ignored when picking the latest baseline`,
      { malformed }
    );
  }
  if (parsed.length === 0) return null;

  parsed.sort((a, b) => compareParsedReleases(a.release, b.release));
  return join(dir, parsed[parsed.length - 1].file);
};

/** Extracts the release number — "Test Results Release 2026-30.2 - Template.csv" -> "30.2". */
export const inferReleaseLabel = (path: string): string => {
  const release = parseRelease(basename(path));
  return release ? `${release.major}.${release.minor}` : basename(path).replace(/\.csv$/, '');
};

export type CsvRow = Record<string, string>;

// How similar Error Identified + Root Cause text must be (cosine) to treat
// two releases' rows for the SAME testCaseId as "the same failure recurring".
// Higher than the KB's advisory threshold (0.45) — this auto-copies a human's
// disposition wholesale, not just injecting advisory context, so it should
// take a real, strong match. Lower than the KB's known-issue short-circuit
// (0.95) — that tier has zero verify safety net behind it; this one is just
// pre-filling two CSV cells a human still reviews before the sheet gets used.
const DEFAULT_THRESHOLD = Number(process.env.AI_HEAL_RELEASE_COMPARE_THRESHOLD || '0.75');

// currentCsvPath is always this pipeline's own release.csv (or another file
// following the exact same CSV_HEADERS) — exact-key parsing is safe there.
const readCsvRows = (path: string): Promise<CsvRow[]> =>
  new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    createReadStream(path)
      .pipe(csv())
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

const failureText = (errorIdentified: string, rootCause: string): string =>
  [errorIdentified, rootCause].filter(Boolean).join(' ').trim();

export interface PreviousReviewedRow {
  testCaseId: string;
  errorIdentified: string;
  rootCause: string;
  qaReview: string;
  rootCauseQA: string;
  commentsQA: string;
}

// previousCsvPath is a human/Notion-maintained export, not guaranteed to use
// this pipeline's exact header strings — casing drifts ("Test Case ID" vs
// "Test Case Id"), and real-world exports have repeated the QA
// Review/Root cause QA columns later in the row for unrelated per-assignee
// tracking. Match headers case-insensitively (ignoring extra whitespace) and
// always take the FIRST occurrence of a recognized column — csv-parser's
// mapHeaders returning null drops a column entirely, which we use both for
// unrecognized columns and for repeats of an already-mapped one.
const PREVIOUS_HEADER_ALIASES: Record<string, keyof PreviousReviewedRow> = {
  'test case id': 'testCaseId',
  'error identified': 'errorIdentified',
  'root cause': 'rootCause',
  'qa review': 'qaReview',
  'root cause qa': 'rootCauseQA',
  'comments qa': 'commentsQA',
};

const readPreviousReviewedRows = (path: string): Promise<PreviousReviewedRow[]> =>
  new Promise((resolve, reject) => {
    const rows: PreviousReviewedRow[] = [];
    const seen = new Set<string>();
    createReadStream(path)
      .pipe(
        csv({
          mapHeaders: ({ header }: { header: string }) => {
            const normalized = header.trim().toLowerCase().replace(/\s+/g, ' ');
            const canonical = PREVIOUS_HEADER_ALIASES[normalized];
            if (!canonical || seen.has(canonical)) return null;
            seen.add(canonical);
            return canonical;
          },
        })
      )
      .on('data', (row: Partial<PreviousReviewedRow>) =>
        rows.push({
          testCaseId: row.testCaseId ?? '',
          errorIdentified: row.errorIdentified ?? '',
          rootCause: row.rootCause ?? '',
          qaReview: row.qaReview ?? '',
          rootCauseQA: row.rootCauseQA ?? '',
          commentsQA: row.commentsQA ?? '',
        })
      )
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

export interface CompareReleasesOptions {
  threshold?: number;
  previousReleaseId?: string;
}

export interface CompareReleasesResult {
  currentRows: number;
  previousReviewedRows: number;
  candidates: number;
  matched: number;
}

/**
 * Copies a matched baseline row's disposition onto the current release's
 * row: QA Review and Root cause QA only into empty cells, and Comments QA
 * prefixed with the "[AI-HEAL: <previousReleaseLabel>]" marker (see
 * aiHealMarker.ts) so the dashboard can tell this row was dispositioned by
 * ai-heal rather than by QA. The marker is written even when the baseline had
 * no comment, and replaces any marker the baseline's comment already carried
 * (a baseline exported from the dashboard has one). A Comments QA the current
 * row already has is kept — only prefixed, unless it is already marked (e.g.
 * by the 'known-issue' KB tier, whose ref is more specific).
 */
export const carryForwardReview = (
  row: CsvRow,
  previous: PreviousReviewedRow,
  previousReleaseLabel: string
): void => {
  const current = row['Comments QA']?.trim() ?? '';
  if (!current) {
    row['Comments QA'] = withAiHealMarker(previousReleaseLabel, previous.commentsQA);
  } else if (!hasAiHealMarker(current)) {
    row['Comments QA'] = withAiHealMarker(previousReleaseLabel, current);
  }
  if (!row['QA Review']?.trim()) row['QA Review'] = previous.qaReview;
  if (!row['Root cause QA']?.trim()) row['Root cause QA'] = previous.rootCauseQA;
};

/**
 * Compares every row of `currentCsvPath` against the same testCaseId's
 * REVIEWED row (if any) in `previousCsvPath`. A close enough match carries
 * QA Review, Root cause QA and Comments QA forward from the base release —
 * see carryForwardReview for the "[AI-HEAL: …]" marker it adds. Never
 * overwrites a QA Review / Root cause QA cell the current CSV already has
 * content in. Rewrites `currentCsvPath` in place.
 */
export const compareWithPreviousRelease = async (
  currentCsvPath: string,
  previousCsvPath: string,
  opts: CompareReleasesOptions = {}
): Promise<CompareReleasesResult> => {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const previousReleaseLabel = opts.previousReleaseId ?? inferReleaseLabel(previousCsvPath);
  const currentRows = await readCsvRows(currentCsvPath);
  const previousRows = await readPreviousReviewedRows(previousCsvPath);

  // Only rows the previous release actually reviewed have anything worth
  // copying forward — QA Review and Root cause QA both non-empty.
  const previousByTestCaseId = new Map<string, PreviousReviewedRow>();
  for (const row of previousRows) {
    if (row.testCaseId.trim() && row.qaReview.trim() && row.rootCauseQA.trim()) {
      previousByTestCaseId.set(row.testCaseId.trim(), row);
    }
  }

  // Only testCaseIds present (and reviewed) in BOTH releases need embedding —
  // batch every pair's texts into one embed() call instead of one per row.
  const candidates = currentRows
    .map((row) => ({ row, previous: previousByTestCaseId.get(row['Test Case Id']?.trim()) }))
    .filter((c): c is { row: CsvRow; previous: PreviousReviewedRow } => Boolean(c.previous));

  let matched = 0;
  if (candidates.length > 0) {
    const texts = candidates.flatMap((c) => [
      failureText(c.row['Error Identified'], c.row['Root Cause']),
      failureText(c.previous.errorIdentified, c.previous.rootCause),
    ]);
    const vectors = await embed(texts);

    candidates.forEach((c, i) => {
      const similarity = cosine(vectors[i * 2], vectors[i * 2 + 1]);
      const testCaseId = c.row['Test Case Id'];

      if (similarity < threshold) {
        log.debug('compareReleases', `${testCaseId}: not reiterative`, {
          similarity: Number(similarity.toFixed(2)),
          threshold,
        });
        return;
      }

      matched++;
      carryForwardReview(c.row, c.previous, previousReleaseLabel);

      log.decision(
        'compareReleases',
        'marked reiterative',
        `${testCaseId} similarity ${similarity.toFixed(2)}`,
        {
          testCaseId,
          qaReview: c.row['QA Review'],
          rootCauseQA: c.row['Root cause QA'],
          commentsQA: c.row['Comments QA'],
        }
      );
    });
  }

  const lines = [toCsvRow(CSV_HEADERS)];
  for (const row of currentRows) {
    lines.push(toCsvRow(CSV_HEADERS.map((h) => row[h] ?? '')));
  }
  writeCsvAtomic(currentCsvPath, lines.join('\n') + '\n');

  const result: CompareReleasesResult = {
    currentRows: currentRows.length,
    previousReviewedRows: previousByTestCaseId.size,
    candidates: candidates.length,
    matched,
  };
  log.info('compareReleases', 'cross-release comparison done', {
    ...result,
    previousReleaseId: previousReleaseLabel,
  });
  return result;
};
