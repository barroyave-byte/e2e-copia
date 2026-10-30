import { AdminEventsName } from '@tests/events/adminEventsName';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';

export const ALLOWED_EVENTS: string[] = [
  ...Object.values(CheckoutEventsName),
  ...Object.values(VaultEventsName),
  ...Object.values(AdminEventsName),
];

export const SKIPPED_EVENTS: string[] = [CheckoutEventsName.onInstallmentsDeselected];

export const CONSOLE_PREFIX = '__DEUNA_EVENT__';

/** Default timeout (ms) used to wait for a /v1/track request to reach the server. */
export const TRACK_TIMEOUT_MS = 5000;

/** Timeout (ms) to wait for postMessage events. Some dispatch with a delay depending on their implementation. */
export const POSTMESSAGE_TIMEOUT_MS = 5000;

/** Endpoint the analytics provider (RudderStack) hits to record events. */
export const TRACK_ENDPOINT = '/v1/track';
