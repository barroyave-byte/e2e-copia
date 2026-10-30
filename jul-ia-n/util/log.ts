type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

const resolveLevel = (): LogLevel => {
  const raw = (process.env.AI_HEAL_LOG_LEVEL || 'info').toLowerCase();
  if (raw in LEVEL_RANK) return raw as LogLevel;
  return 'info';
};

const currentLevel = resolveLevel();

const shouldLog = (level: LogLevel): boolean =>
  LEVEL_RANK[level] >= LEVEL_RANK[currentLevel];

const formatPrefix = (step: string, level: LogLevel): string => {
  const ts = new Date().toISOString().slice(11, 23);
  const tag = `[${step}]`.padEnd(20);
  return `${ts} ${level.toUpperCase().padEnd(5)} ${tag}`;
};

const truncate = (value: unknown, max = 200): string => {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}… [+${s.length - max} chars]` : s;
};

export const log = {
  debug: (step: string, msg: string, extra?: Record<string, unknown>): void => {
    if (!shouldLog('debug')) return;
    const tail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.log(`${formatPrefix(step, 'debug')} ${msg}${tail}`);
  },
  info: (step: string, msg: string, extra?: Record<string, unknown>): void => {
    if (!shouldLog('info')) return;
    const tail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.log(`${formatPrefix(step, 'info')} ${msg}${tail}`);
  },
  warn: (step: string, msg: string, extra?: Record<string, unknown>): void => {
    if (!shouldLog('warn')) return;
    const tail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.warn(`${formatPrefix(step, 'warn')} ${msg}${tail}`);
  },
  error: (step: string, msg: string, err?: unknown): void => {
    if (!shouldLog('error')) return;
    const detail =
      err instanceof Error
        ? ` :: ${err.message}\n${err.stack ?? ''}`
        : err
          ? ` :: ${JSON.stringify(err)}`
          : '';
    console.error(`${formatPrefix(step, 'error')} ${msg}${detail}`);
  },
  decision: (
    step: string,
    decision: string,
    reason: string,
    extra?: Record<string, unknown>,
  ): void => {
    if (!shouldLog('info')) return;
    const tail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.log(
      `${formatPrefix(step, 'info')} DECISION: ${decision}  ←  ${reason}${tail}`,
    );
  },
  preview: (step: string, label: string, value: unknown, max = 200): void => {
    if (!shouldLog('debug')) return;
    console.log(
      `${formatPrefix(step, 'debug')} ${label}: ${truncate(value, max)}`,
    );
  },
  separator: (caseId: string, indexLabel: string): void => {
    if (!shouldLog('info')) return;
    const line = '─'.repeat(80);
    console.log(`\n${line}\n[CASE ${indexLabel}] ${caseId}\n${line}`);
  },
};

export const isDebug = (): boolean => shouldLog('debug');
