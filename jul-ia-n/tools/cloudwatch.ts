import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilteredLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';

import { CloudWatchEvent } from '../schemas/investigatedFailure';

let _client: CloudWatchLogsClient | null = null;
const getClient = (): CloudWatchLogsClient => {
  if (!_client) {
    _client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return _client;
};

export interface QueryLogsOptions {
  logGroup: string;
  filterPattern: string;
  startTimeMs: number;
  endTimeMs: number;
  limit?: number;
}

export const buildFilterByValue = (value: string): string => `"${value}"`;

export const buildFilterByOrderId = (orderId: string): string =>
  buildFilterByValue(orderId);

export const buildFilterByRequestId = (requestId: string): string =>
  buildFilterByValue(requestId);

export const combineFiltersAny = (filters: string[]): string => {
  const cleaned = filters.filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  return `?${cleaned.join(' ?')}`;
};

const toEvent = (
  event: FilteredLogEvent,
  logGroup: string,
): CloudWatchEvent => ({
  timestampMs: event.timestamp ?? 0,
  logGroup,
  logStream: event.logStreamName ?? null,
  message: event.message ?? '',
});

export const queryLogs = async (
  opts: QueryLogsOptions,
): Promise<CloudWatchEvent[]> => {
  const client = getClient();
  const events: CloudWatchEvent[] = [];
  const limit = opts.limit ?? 200;

  let nextToken: string | undefined;
  do {
    const resp = await client.send(
      new FilterLogEventsCommand({
        logGroupName: opts.logGroup,
        filterPattern: opts.filterPattern,
        startTime: opts.startTimeMs,
        endTime: opts.endTimeMs,
        limit: Math.min(limit - events.length, 100),
        nextToken,
      }),
    );
    for (const e of resp.events ?? []) {
      events.push(toEvent(e, opts.logGroup));
      if (events.length >= limit) break;
    }
    nextToken = resp.nextToken;
  } while (nextToken && events.length < limit);

  return events;
};

export const queryLogsByIds = async (
  logGroup: string,
  ids: string[],
  startTimeMs: number,
  endTimeMs: number,
  limit?: number,
): Promise<CloudWatchEvent[]> => {
  const filterPattern = combineFiltersAny(ids.map(buildFilterByValue));
  if (!filterPattern) return [];
  return queryLogs({ logGroup, filterPattern, startTimeMs, endTimeMs, limit });
};
