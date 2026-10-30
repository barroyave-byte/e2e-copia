import { Page, Request } from '@playwright/test';
import { installEventListener } from './browserScript';
import { ALLOWED_EVENTS, CONSOLE_PREFIX, SKIPPED_EVENTS, TRACK_ENDPOINT } from './constants';
import type { CapturedEvent, TrackedEvent, TrackRequestPayload } from './interfaces';

/**
 * Standalone event capture engine — captures checkout events from two sources:
 *  1. postMessage (via console.log bridge from browserScript.ts)
 *  2. HTTP POST to /v1/track
 *
 * Decoupled from the framework DSL so it can be used by both:
 *  - PluginAnalyticsEvents (framework DSL — calls start with injectScript: true)
 *  - Page objects like VaultWidgetPage (direct usage — injectScript: false,
 *    relies on /track capture + existing console listeners)
 */
export class EventCapture {
  private buffer: CapturedEvent[] = [];
  private trackBuffer: TrackedEvent[] = [];
  private skippedEvents: Set<string> = new Set();
  private started = false;

  constructor(private page: Page) {}

  /**
   * Starts capturing events. Idempotent.
   *
   * @param injectScript - If true, calls addInitScript to inject the
   *   browserScript listener for zoid/postMessage capture. Only works if called
   *   BEFORE navigation. Default: false (safe for late initialization).
   */
  async start(options?: { skip?: string[]; injectScript?: boolean }): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.buffer = [];
    this.trackBuffer = [];
    this.skippedEvents = new Set([...SKIPPED_EVENTS, ...(options?.skip ?? [])]);

    const context = this.page.context();

    // Always: capture postMessage events via console.log bridge
    this.subscribeConsoleForPage(this.page);
    context.on('page', (newPage) => this.subscribeConsoleForPage(newPage));

    // Always: capture /v1/track requests
    context.on('request', (request) => this.captureTrackRequest(request));

    // Optional: inject in-frame event listener for zoid envelopes.
    // Only effective if called before navigation — skipped by default for
    // late initialization (e.g. from page objects mid-test).
    if (options?.injectScript) {
      await context.addInitScript(installEventListener, {
        skipList: [...this.skippedEvents],
        allowedList: ALLOWED_EVENTS,
        prefix: CONSOLE_PREFIX,
      });
    }
  }

  /**
   * Waits until the event appears in the requested source(s).
   *
   * `source` defaults to `'any'` (postMessage OR /track) for callers that only
   * care whether the event happened at all (e.g. page objects that don't
   * inject the postMessage listener). Callers that subsequently read from a
   * specific buffer — e.g. `verifySequence`, which asserts against the
   * postMessage buffer only — must pass the matching `source` so the wait
   * doesn't resolve early on the other (unread) buffer and race the assertion.
   */
  async waitForEvent(
    event: string,
    options?: {
      timeout?: number;
      source?: 'any' | 'postMessage' | 'track';
      minOccurrences?: number;
    }
  ): Promise<boolean> {
    const timeout = options?.timeout ?? 5000;
    const source = options?.source ?? 'any';
    const minOccurrences = options?.minOccurrences ?? 1;
    const countInPostMessageBuffer = () => this.buffer.filter((e) => e.event === event).length;
    const countInTrackBuffer = () => this.trackBuffer.filter((e) => e.event === event).length;

    const predicate =
      source === 'postMessage'
        ? () => countInPostMessageBuffer() >= minOccurrences
        : source === 'track'
          ? () => countInTrackBuffer() >= minOccurrences
          : () => countInPostMessageBuffer() + countInTrackBuffer() >= minOccurrences;

    return this.waitFor(predicate, timeout);
  }

  /** Number of times `event` has been captured so far, from one buffer. */
  countOf(event: string, source: 'postMessage' | 'track' = 'postMessage'): number {
    const buf = source === 'postMessage' ? this.buffer : this.trackBuffer;
    return buf.filter((e) => e.event === event).length;
  }

  /**
   * Returns the metadata of the last captured occurrence of `event`, or null.
   * Checks postMessage buffer first (authoritative), falls back to /track.
   */
  getEventMetadata(event: string): Record<string, unknown> | null {
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].event === event) return this.buffer[i].metadata;
    }
    for (let i = this.trackBuffer.length - 1; i >= 0; i--) {
      if (this.trackBuffer[i].event === event) return this.trackBuffer[i].metadata;
    }
    return null;
  }

  wasTracked(event: string): boolean {
    return this.trackBuffer.some((e) => e.event === event);
  }

  get events(): CapturedEvent[] {
    return [...this.buffer].sort((a, b) => a.ts - b.ts);
  }

  get trackedEvents(): TrackedEvent[] {
    return [...this.trackBuffer];
  }

  // --- Private ---

  private subscribeConsoleForPage(page: Page): void {
    page.on('console', (msg) => {
      if (msg.type() !== 'log') return;
      const text = msg.text();
      if (!text.startsWith(CONSOLE_PREFIX)) return;
      try {
        const evt = JSON.parse(text.slice(CONSOLE_PREFIX.length)) as CapturedEvent;
        if (this.isCrossFrameEcho(evt)) return;
        this.buffer.push(evt);
      } catch {
        /* ignore */
      }
    });
  }

  private isCrossFrameEcho(evt: CapturedEvent): boolean {
    return this.buffer.some(
      (e) =>
        e.event === evt.event &&
        (e.frame !== evt.frame || e.source !== evt.source) &&
        JSON.stringify(e.metadata) === JSON.stringify(evt.metadata)
    );
  }

  private captureTrackRequest(request: Request): void {
    if (request.method() !== 'POST') return;
    if (!request.url().includes(TRACK_ENDPOINT)) return;
    const postData = request.postData();
    if (!postData) return;
    try {
      const data = JSON.parse(postData) as TrackRequestPayload;
      const eventName = data?.event;
      if (!eventName) return;
      if (this.skippedEvents.has(eventName)) return;
      this.trackBuffer.push({
        event: eventName,
        metadata: data.properties?.metadata ?? {},
        ts: Date.now(),
      });
    } catch {
      /* ignore */
    }
  }

  private async waitFor(predicate: () => boolean, timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (predicate()) return true;
      await this.page.waitForTimeout(500);
    }
    return predicate();
  }
}
