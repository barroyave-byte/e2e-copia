type CountryCode = string;

type CutoffTime = {
  hour: number;
  minute: number;
};

const timeZoneByCountry: Record<CountryCode, string> = {
  PE: 'America/Lima',
  CO: 'America/Bogota',
  CL: 'America/Santiago',
  MX: 'America/Mexico_City',
  AR: 'America/Argentina/Buenos_Aires',
  BR: 'America/Sao_Paulo',
  EC: 'America/Guayaquil',
};

const parseHHmm = (hhmm: string): CutoffTime => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) {
    throw new Error(`Invalid cutoff time format: ${hhmm}. Expected HH:mm`);
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
};

const getLocalMinutesSinceMidnight = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error(`Unable to compute local time for timeZone=${timeZone}`);
  }

  return hour * 60 + minute;
};

/**
 * payments rejects a void on a transaction created the same local day from 20:59:00 on
 * (DP-4004 "unable to void a transaction performed same day after 20:59:00 hours in CO").
 */
export const SAME_DAY_VOID_CUTOFF = '20:59';

/**
 * Time between evaluating the skip and the void request actually reaching payments:
 * merchant setup, purchase, status polling and up to 2 retries.
 */
export const SAME_DAY_VOID_SAFETY_MARGIN_MINUTES = 5;

export type TimeCutoffSkipOptions = {
  country: CountryCode;
  cutoffLocalTime: string;
  safetyMarginMinutes?: number;
  timeZone?: string;
  now?: Date;
  featureName?: string;
};

export const shouldSkipAfterLocalTime = (
  opts: TimeCutoffSkipOptions
): { skip: boolean; reason: string } => {
  const timeZone = opts.timeZone ?? timeZoneByCountry[opts.country];
  if (!timeZone) {
    return {
      skip: false,
      reason: `No timeZone configured for country=${opts.country}; not skipping by time`,
    };
  }

  const { hour, minute } = parseHHmm(opts.cutoffLocalTime);
  const cutoffMinutes = hour * 60 + minute - (opts.safetyMarginMinutes ?? 0);
  const now = opts.now ?? new Date();
  const localMinutes = getLocalMinutesSinceMidnight(now, timeZone);

  const skip = localMinutes >= cutoffMinutes;

  const reasonPrefix = opts.featureName ? `[${opts.featureName}] ` : '';
  const marginSuffix = opts.safetyMarginMinutes
    ? ` minus a ${opts.safetyMarginMinutes} min safety margin`
    : '';
  const reason = `${reasonPrefix}Skipping: local time in ${opts.country} (${timeZone}) is after ${opts.cutoffLocalTime}${marginSuffix}`;

  return { skip, reason };
};

/**
 * Evaluate at run time, not at file load: pass it as `test.skip(() => ...)` or call it right
 * before the void. A describe-level `test.skip(boolean)` is decided when the worker loads the
 * file, which can be minutes before the void request.
 */
export const shouldSkipSameDayVoid = (country: CountryCode): { skip: boolean; reason: string } =>
  shouldSkipAfterLocalTime({
    country,
    cutoffLocalTime: SAME_DAY_VOID_CUTOFF,
    safetyMarginMinutes: SAME_DAY_VOID_SAFETY_MARGIN_MINUTES,
    featureName: 'Void',
  });
