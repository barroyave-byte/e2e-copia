import type { EventSource, InstallEventListenerParams, PostMessagePayload } from './interfaces';

/**
 * Injected into every frame via page.addInitScript. Captures postMessage events
 * (direct dispatches and Zoid/post-robot RPC envelopes) and forwards them to
 * Node via console.log with a known prefix.
 *
 * Must be self-contained: no closures, no runtime imports — Playwright
 * serializes this function with .toString() and evaluates it in the browser.
 */
export function installEventListener({
  skipList,
  allowedList,
  prefix,
}: InstallEventListenerParams) {
  if (window.__deunaEventsInstalled) return;

  window.__deunaEventsInstalled = true;
  window.__deunaEventsSkip = new Set(skipList);
  window.__deunaEventsAllowed = new Set(allowedList);

  const deepParse = (input: unknown): unknown => {
    if (typeof input !== 'string') return input;

    try {
      const parsed = JSON.parse(input);
      return typeof parsed === 'string' ? deepParse(parsed) : parsed;
    } catch {
      return input;
    }
  };

  // Zoid wraps xprops.onEventDispatch calls in post-robot RPC envelopes.
  // The real checkout event lives at __post_robot_*[*].data.args[0].
  const extractFromPostRobot = (parsed: unknown): PostMessagePayload | null => {
    if (!parsed || typeof parsed !== 'object') return null;

    const wrapperKey = Object.keys(parsed as object).find((k) => k.startsWith('__post_robot_'));
    if (!wrapperKey) return null;

    const entries = (parsed as Record<string, unknown>)[wrapperKey];
    if (!Array.isArray(entries)) return null;

    for (const entry of entries) {
      const rpc = (entry as { data?: { name?: string; args?: unknown[] } } | null)?.data;

      if (rpc?.name === 'onEventDispatch' && Array.isArray(rpc.args)) {
        const evt = rpc.args[0] as PostMessagePayload | undefined;
        if (evt?.type) return evt;
      }
    }

    return null;
  };

  const extractPayload = (raw: unknown): PostMessagePayload | null => {
    const parsed = deepParse(raw) as PostMessagePayload | null;
    if (parsed?.type) return parsed;
    return extractFromPostRobot(parsed);
  };

  window.addEventListener('message', (ev: MessageEvent) => {
    try {
      const payload = extractPayload(ev.data);

      if (!payload?.type) return;
      if (!window.__deunaEventsAllowed?.has(payload.type)) return;
      if (window.__deunaEventsSkip?.has(payload.type)) return;

      const source: EventSource = (deepParse(ev.data) as PostMessagePayload | null)?.type
        ? 'direct'
        : 'envelope';

      console.log(
        prefix +
          JSON.stringify({
            event: payload.type,
            metadata: payload.data?.metadata ?? {},
            ts: Date.now(),
            frame: window.location.pathname,
            source,
          })
      );
    } catch {
      // Ignore malformed messages
    }
  });
}
