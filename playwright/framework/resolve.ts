/**
 * Where a DSL action gets a value it was not given.
 *
 * Every value an action needs but does not receive as a parameter resolves through here, in
 * this order:
 *
 *   1. the explicit parameter the spec passed;
 *   2. `context.merchant`, set by a `setup.merchant.*` action in this run;
 *   3. the step store, set by a `saveAs` on an earlier step;
 *
 * There is no longer a legacy tier. It used to be `saveConfig` / `tokenizeOrder` reading
 * `process.env`, which is how an action could take no parameters and still work: it silently
 * picked up whatever merchant or order the worker had set last. Both classes are deleted.
 *
 * Every value now comes from the call site, the test context, or a `setup.*` step, and an
 * action whose value is missing fails naming itself instead of using another spec's.
 *
 * When adding an action, prefer a required parameter. Reach for a resolver only when the
 * value genuinely belongs to the run rather than to the step.
 */

import { Context } from './plugins/interface';

/** Well-known step-store keys the setup actions publish. */
export const STATE_KEYS = {
  merchantId: 'merchantId',
  merchantToken: 'merchantToken',
  merchantName: 'merchantName',
  privateKey: 'privateKey',
  publicKey: 'publicKey',
  orderToken: 'orderToken',
  orderId: 'orderId',
  userToken: 'userToken',
  userEmail: 'userEmail',
  userId: 'userId',
} as const;

function fromState(context: Context, key: string): string | undefined {
  const state = context.state;
  if (!state?.has(key)) return undefined;

  const value = state.get(key);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Non-empty strings only — the legacy getters return `undefined` when the env var is unset. */
function firstPresent(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0);
}

/** The resolution chain for each value, tiers 1–4 in order. */
const CHAINS = {
  // No legacy tier left: the MERCHANT_* globals are gone, so a merchant comes from an
  // explicit parameter, `context.merchant`, or a `setup.merchant.*` step.
  merchantId: (c: Context) => [c.merchant?.merchantId, fromState(c, STATE_KEYS.merchantId)],
  merchantToken: (c: Context) => [
    c.merchant?.merchantToken,
    fromState(c, STATE_KEYS.merchantToken),
  ],
  privateKey: (c: Context) => [c.merchant?.privateKey, fromState(c, STATE_KEYS.privateKey)],
  publicKey: (c: Context) => [c.merchant?.publicKey, fromState(c, STATE_KEYS.publicKey)],
  // USER_AUTH_TOKEN is gone along with the rest of the globals. Falling back to a shared
  // variable here would silently turn a guest checkout into an authenticated one whenever a
  // previous test in the same worker had set it. An authenticated flow passes the token to
  // `checkout.openCheckout`, or publishes it from an earlier `setup.user.login` step.
  userToken: (c: Context) => [fromState(c, STATE_KEYS.userToken)],
  // Published by setup.user.register, which already receives user_id in its response — no
  // ambiguity like userToken's guest-vs-authenticated concern, so a plain state read is safe.
  userId: (c: Context) => [fromState(c, STATE_KEYS.userId)],
  // No legacy tier: `ORDER_TOKEN_NEW` / `ORDER_ID_NEW` no longer exist. A spec that
  // tokenizes in a raw `beforeAll` has to pass the token to the action, or publish it
  // through a `setup.order.*` step.
  orderToken: (c: Context) => [fromState(c, STATE_KEYS.orderToken)],
  orderId: (c: Context) => [fromState(c, STATE_KEYS.orderId)],
} satisfies Record<string, (context: Context) => (string | undefined)[]>;

type Resolvable = keyof typeof CHAINS;

/**
 * Best-effort read. Use when the downstream page object has its own default and hardening the
 * action into a throw would change behaviour for specs that have not been migrated.
 */
export function lookup(context: Context, name: Resolvable, explicit?: string): string | undefined {
  return firstPresent(explicit, ...CHAINS[name](context));
}

/** Read or throw, naming the action and how to supply the value. */
function resolve(context: Context, action: string, name: Resolvable, explicit?: string): string {
  const value = lookup(context, name, explicit);
  if (!value) {
    throw new Error(
      `${action}: "${name}" is not available. Pass it in params, or run a setup action ` +
        `(setup.merchant.* / setup.order.*) earlier in the same run.`
    );
  }
  return value;
}

export const resolveMerchantId = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'merchantId', explicit);

export const resolveMerchantToken = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'merchantToken', explicit);

export const resolvePrivateKey = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'privateKey', explicit);

export const resolvePublicKey = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'publicKey', explicit);

export const resolveUserToken = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'userToken', explicit);

export const resolveUserId = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'userId', explicit);

export const resolveOrderToken = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'orderToken', explicit);

export const resolveOrderId = (c: Context, action: string, explicit?: string) =>
  resolve(c, action, 'orderId', explicit);

/** Publishes a value to the step store so later actions resolve it without touching globals. */
export function publish(context: Context, key: string, value: unknown): void {
  if (value !== undefined && value !== null) context.state?.set(key, value);
}
