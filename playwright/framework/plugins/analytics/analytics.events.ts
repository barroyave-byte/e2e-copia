import { expect } from '@playwright/test';
import { FrameworkPlugin } from '../interface';
import { POSTMESSAGE_TIMEOUT_MS, TRACK_ENDPOINT, TRACK_TIMEOUT_MS } from './constants';
import type {
  StartCaptureParams,
  VerifyEventCountParams,
  VerifyMetadataParams,
  VerifySequenceParams,
  WaitForEventParams,
} from './interfaces';
import { EventCapture } from './EventCapture';

/**
 * Captures checkout-domain events from two independent sources and exposes
 * assertions over sequence, metadata and count.
 *
 * Sources:
 *  - postMessage (emission, in-browser) — authoritative for order and payload.
 *  - HTTP POST to /v1/track (server delivery) — verifies the event left the client.
 *
 * Track checks are intentionally loose (presence for sequence/metadata, at-least-N
 * for count) because RudderStack has retries, batching and server-side dedup.
 * Stricter parity on the wire would be flaky without catching real bugs.
 *
 * postMessage capture transport: each frame's listener forwards events to Node
 * via console.log with a known prefix. Cross-origin frames cannot be read from
 * Node via page.evaluate, but their console messages always reach the runner.
 */
export class PluginAnalyticsEvents extends FrameworkPlugin {
  pluginBaseName = 'analytics.events';

  private capture!: EventCapture;

  /**
   * @description Starts capturing postMessage events and /v1/track requests. Call before navigation.
   */
  async $tf_startCapture({ skip = [] }: StartCaptureParams = {}) {
    this.capture = new EventCapture(this.context.page);
    await this.capture.start({ skip, injectScript: true });
  }

  /**
   * @description Asserts captured sequence equals expected and every event reached /v1/track at
   * least once. Plain strings must match exactly; an `{ anyOf }` item accepts whichever of its
   * candidate contiguous runs actually occurred (see SequenceItem).
   */
  async $tf_verifySequence({ expected, timeout = POSTMESSAGE_TIMEOUT_MS }: VerifySequenceParams) {
    for (const item of expected) {
      if (typeof item !== 'string') continue; // can't know in advance which alternative wins
      // `names` below is built exclusively from the postMessage buffer, so the
      // wait must target that same buffer. Waiting on 'any' (postMessage OR
      // /track) can resolve early from a /track POST that lands before the
      // postMessage console relay is processed by Node, causing the
      // subsequent equality check to run one event too soon (flaky race).
      await this.capture.waitForEvent(item, { timeout, source: 'postMessage' });
    }

    const names = this.capture.events.map((e) => e.event);
    const resolved: string[] = [];
    let cursor = 0;

    for (const item of expected) {
      if (typeof item === 'string') {
        expect(
          names[cursor],
          `Expected "${item}" at position ${cursor}, got "${names[cursor] ?? '<nothing>'}". Full capture: ${JSON.stringify(names)}`
        ).toBe(item);
        resolved.push(item);
        cursor += 1;
        continue;
      }

      const match = item.anyOf.find((candidate) =>
        candidate.every((name, i) => names[cursor + i] === name)
      );
      expect(
        match,
        `Expected one of ${JSON.stringify(item.anyOf)} at position ${cursor}, got ${JSON.stringify(
          names.slice(cursor, cursor + Math.max(...item.anyOf.map((c) => c.length)))
        )}. Full capture: ${JSON.stringify(names)}`
      ).toBeTruthy();
      resolved.push(...match!);
      cursor += match!.length;
    }

    expect(
      names.length,
      `Captured ${names.length} events but the sequence only accounted for ${cursor}: ${JSON.stringify(names)}`
    ).toBe(cursor);

    for (const name of resolved) {
      const tracked = await this.waitForTracked(name);
      expect(
        tracked,
        `Event "${name}" was emitted but not sent to ${TRACK_ENDPOINT} within ${TRACK_TIMEOUT_MS}ms`
      ).toBe(true);
    }
  }

  /**
   * @description Asserts latest event metadata matches expected and the event reached /v1/track.
   */
  async $tf_verifyMetadata({ event, expected, timeout = 0 }: VerifyMetadataParams) {
    if (timeout > 0) {
      await this.capture.waitForEvent(event, { timeout });
    }

    const metadata = this.capture.getEventMetadata(event);
    if (!metadata) throw new Error(`Event "${event}" was not captured`);
    expect(metadata).toMatchObject(expected);

    const tracked = await this.waitForTracked(event);
    if (!tracked) {
      throw new Error(
        `Event "${event}" was emitted but not sent to ${TRACK_ENDPOINT} within ${TRACK_TIMEOUT_MS}ms`
      );
    }
  }

  /**
   * @description Waits until an event was captured, without asserting anything about
   * sequence or count. Use this instead of a fixed timing.wait to block on a real
   * signal (e.g. an async auto-save finishing) before an action that would otherwise
   * race it. Pass `nextOccurrence: true` when the event already fired earlier in the
   * same flow (e.g. a repeated login/billing cycle) and reused presence would resolve
   * immediately instead of waiting.
   */
  async $tf_waitForEvent({
    event,
    timeout = POSTMESSAGE_TIMEOUT_MS,
    source = 'postMessage',
    nextOccurrence = false,
  }: WaitForEventParams) {
    const minOccurrences = nextOccurrence ? this.capture.countOf(event, source) + 1 : 1;
    await this.capture.waitForEvent(event, { timeout, source, minOccurrences });
  }

  /**
   * @description Asserts captured event was emitted exactly the expected number of times.
   */
  async $tf_verifyEventCount({ event, expected }: VerifyEventCountParams) {
    const emittedCount = this.capture.events.filter((e) => e.event === event).length;
    expect(emittedCount).toBe(expected);

    const trackCount = this.capture.trackedEvents.filter((e) => e.event === event).length;
    expect(
      trackCount,
      `Event "${event}" was emitted ${expected} time(s) but only ${trackCount} reached ${TRACK_ENDPOINT}`
    ).toBeGreaterThanOrEqual(expected);
  }

  private async waitForTracked(event: string): Promise<boolean> {
    const deadline = Date.now() + TRACK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (this.capture.wasTracked(event)) return true;
      await this.context.page.waitForTimeout(500);
    }
    return this.capture.wasTracked(event);
  }
}
