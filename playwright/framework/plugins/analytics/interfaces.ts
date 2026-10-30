/**
 * Expected payload shapes received via window.postMessage.
 *
 * 1. Direct postMessage:
 *    {
 *      "type": "<eventName>",
 *      "data": {
 *        "metadata": { ... },
 *        ...
 *      }
 *    }
 *
 * 2. Zoid post-robot envelope:
 *    {
 *      "__post_robot_<version>__": [{
 *        "data": {
 *          "name": "onEventDispatch",
 *          "args": [
 *            { "type": "<eventName>", "data": { "metadata": { ... }, ... } }
 *          ]
 *        }
 *      }]
 *    }
 *
 *    The inner object at args[0] follows the same `{type, data}` shape as
 *    direct postMessage.
 */

/** Channel through which a postMessage event was captured. */
export type EventSource = 'direct' | 'envelope';

/** Event captured via postMessage; frame + source are used for dedup. */
export interface CapturedEvent {
  event: string;
  metadata: Record<string, unknown>;
  ts: number;
  frame: string;
  source: EventSource;
}

/** Event captured from a POST to /v1/track. No frame nor source: it comes from an HTTP request. */
export type TrackedEvent = Omit<CapturedEvent, 'frame' | 'source'>;

/** Inner event shape, common to direct postMessage and post-robot envelopes. */
export interface PostMessagePayload {
  type?: string;
  data?: { metadata?: Record<string, unknown> };
}

/** POST body sent to /v1/track. */
export interface TrackRequestPayload {
  event?: string;
  properties?: { metadata?: Record<string, unknown> };
}

export interface InstallEventListenerParams {
  skipList: string[];
  allowedList: string[];
  prefix: string;
}

export interface StartCaptureParams {
  skip?: string[];
}

/**
 * A plain event name must match exactly at that position. `{ anyOf }` covers a
 * product-level race outside test control — e.g. cross-domain login either
 * resolving in time (one event) or falling back to a full re-auth (several
 * events) — where either outcome is a legitimate, already-observed product
 * behavior, not a bug the test should fail on (ENTP1-T2026 / ENTP1-16976).
 * Each candidate in `anyOf` is a contiguous run of event names; the first one
 * that matches the actual events starting at that position is accepted.
 */
export type SequenceItem = string | { anyOf: string[][] };

export interface VerifySequenceParams {
  expected: SequenceItem[];
  timeout?: number;
}

export interface WaitForEventParams {
  event: string;
  timeout?: number;
  source?: 'postMessage' | 'track';
  /**
   * Wait for the NEXT occurrence rather than any-time-ever — needed when the
   * event already fired earlier in the flow (e.g. a second login/billing
   * cycle re-emits the same event name).
   */
  nextOccurrence?: boolean;
}

export interface VerifyMetadataParams {
  event: string;
  expected: Record<string, unknown>;
  timeout?: number;
}

export interface VerifyEventCountParams {
  event: string;
  expected: number;
}

declare global {
  interface Window {
    __deunaEventsInstalled?: boolean;
    __deunaEventsSkip?: Set<string>;
    __deunaEventsAllowed?: Set<string>;
  }
}
