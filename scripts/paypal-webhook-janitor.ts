/**
 * PayPal webhook janitor.
 *
 * PayPal enforces a hard cap of 10 webhooks per REST app, and DEUNA registers one
 * webhook per payment processor (`<notificationURL>/payconnect/<processorId>`, see
 * payments/api/http/controllers/merchant_payment_processor.go). Every environment
 * (dev, staging, preprod) and every local run share the same sandbox apps, so each
 * app's cap is a single global budget.
 *
 * The suite uses two apps, each with its own 10 slots (see PAYPAL_APPS below):
 * PayPal Wallet registers its webhook with `public_api_key`, while Pay Later and
 * Venmo register theirs with `extra_params.client_id`, which belongs to another app.
 *
 * Deleting the processor is supposed to delete its webhook, but that cleanup is
 * best-effort in the backend: if the PayPal call fails, the processor row is removed
 * anyway and the webhook stays behind forever, invisible to any cleanup that starts
 * from the database. This janitor starts from PayPal instead: it lists the webhooks
 * that actually exist, resolves each one back to its processor, and reports (or
 * deletes) the ones whose processor is gone or soft-deleted.
 *
 * Dry-run by default. Nothing is deleted unless --delete is passed explicitly.
 *
 *   npm run paypal:janitor                  # report only
 *   npm run paypal:janitor -- --delete      # delete confirmed orphans
 *   npm run paypal:janitor -- --host api.stg.deuna.io
 *   npm run paypal:janitor -- --app spb     # only one app
 *
 * Environment: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET for the wallet app and
 * PAYPAL_SPB_CLIENT_ID / PAYPAL_SPB_CLIENT_SECRET for the Pay Later / Venmo app (each
 * falls back to the committed sandbox credentials of its processor config),
 * METABASE_USER / METABASE_PASSWORD.
 */
import axios from 'axios';
import * as dotenv from 'dotenv';
import { paypalWalletProcessor } from '@support/interfaces/payment_processors/paypalWalletProcessor';
import { paypalPayLaterProcessor } from '@support/interfaces/payment_processors/paypalSpbProcessors';

dotenv.config();

const PAYPAL_API = process.env.PAYPAL_API_BASE_URL || 'https://api-m.sandbox.paypal.com';
const METABASE_API = 'https://insights.deuna.com';
const SLOTS_PER_APP = 10;

interface PaypalApp {
  name: string;
  description: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
}

/**
 * The PayPal REST apps whose webhooks the suite consumes. The backend picks the app by
 * processor: `public_api_key` for paypal_wallet (all its variants), and
 * `extra_params.client_id` for paypal_pay_later and venmo, both paired with
 * `private_api_key`. Venmo shares the Pay Later config, so it shares its app too.
 */
const PAYPAL_APPS: PaypalApp[] = [
  {
    name: 'wallet',
    description: 'PayPal Wallet',
    clientId: process.env.PAYPAL_CLIENT_ID || paypalWalletProcessor.public_api_key,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || paypalWalletProcessor.private_api_key,
  },
  {
    name: 'spb',
    description: 'PayPal Pay Later / Venmo',
    clientId:
      process.env.PAYPAL_SPB_CLIENT_ID ||
      (paypalPayLaterProcessor.extra_params as { client_id?: string }).client_id,
    clientSecret: process.env.PAYPAL_SPB_CLIENT_SECRET || paypalPayLaterProcessor.private_api_key,
  },
];

/**
 * Maps a webhook host to the Metabase card whose database holds that environment's
 * `merchant_payment_processor` table. The card is only used to resolve the database
 * id, the same way the suite already resolves it elsewhere — the ids of the databases
 * themselves are not hardcoded.
 *
 * A host that is not listed here (preprod, a local tunnel) is reported as UNKNOWN and
 * never deleted: without a database to check against, "orphan" cannot be established.
 */
const HOST_TO_METABASE_CARD: Record<string, { env: string; cardId: number }> = {
  'api.dev.deuna.io': { env: 'develop', cardId: 5893 },
  'api.stg.deuna.io': { env: 'staging', cardId: 5894 },
};

const PROCESSOR_ID_FROM_URL = /\/payconnect\/([0-9a-f-]{36})$/i;

type WebhookStatus = 'ACTIVE' | 'ORPHAN' | 'UNKNOWN';

interface PaypalWebhook {
  id: string;
  url: string;
}

interface ClassifiedWebhook extends PaypalWebhook {
  app: string;
  host: string;
  env: string;
  processorId: string | null;
  status: WebhookStatus;
  reason: string;
}

interface Options {
  delete: boolean;
  hosts: string[] | null;
  apps: string[] | null;
  maxDelete: number;
  json: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { delete: false, hosts: null, apps: null, maxDelete: 10, json: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--delete') options.delete = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--host') options.hosts = [...(options.hosts ?? []), argv[++i]];
    else if (arg.startsWith('--host=')) options.hosts = [...(options.hosts ?? []), arg.slice(7)];
    else if (arg === '--app') options.apps = [...(options.apps ?? []), argv[++i]];
    else if (arg.startsWith('--app=')) options.apps = [...(options.apps ?? []), arg.slice(6)];
    else if (arg.startsWith('--max-delete=')) options.maxDelete = Number(arg.slice(13));
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: npm run paypal:janitor -- [--delete] [--host <host>] [--app <wallet|spb>] [--max-delete=N] [--json]'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const knownApps = PAYPAL_APPS.map((app) => app.name);
  const unknownApp = options.apps?.find((app) => !knownApps.includes(app));
  if (options.apps && unknownApp !== undefined) {
    throw new Error(`Unknown --app: ${unknownApp}. Known apps: ${knownApps.join(', ')}`);
  }

  if (!Number.isInteger(options.maxDelete) || options.maxDelete < 1) {
    throw new Error(`--max-delete must be a positive integer, got: ${options.maxDelete}`);
  }

  return options;
}

async function getPaypalToken(app: PaypalApp): Promise<string> {
  if (!app.clientId || !app.clientSecret) {
    throw new Error(`No PayPal credentials for the ${app.name} app and no fallback exists.`);
  }

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: app.clientId, password: app.clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30_000,
    }
  );

  return response.data.access_token;
}

async function listWebhooks(token: string): Promise<PaypalWebhook[]> {
  const response = await axios.get(`${PAYPAL_API}/v1/notifications/webhooks`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });

  return (response.data?.webhooks ?? []).map((webhook: PaypalWebhook) => ({
    id: webhook.id,
    url: webhook.url,
  }));
}

async function deleteWebhook(token: string, webhookId: string): Promise<void> {
  await axios.delete(`${PAYPAL_API}/v1/notifications/webhooks/${webhookId}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
}

async function getMetabaseToken(): Promise<string> {
  const username = process.env.METABASE_USER || process.env.MB_USER;
  const password = process.env.METABASE_PASSWORD || process.env.MB_PASSWORD;

  if (!username || !password) {
    throw new Error('METABASE_USER / METABASE_PASSWORD are not set.');
  }

  const response = await axios.post(
    `${METABASE_API}/api/session`,
    { username, password },
    { timeout: 30_000 }
  );

  return response.data.id;
}

async function resolveDatabaseId(metabaseToken: string, cardId: number): Promise<number> {
  const response = await axios.get(`${METABASE_API}/api/card/${cardId}`, {
    headers: { 'X-Metabase-Session': metabaseToken },
    timeout: 30_000,
  });

  return response.data.database_id;
}

/**
 * Returns the ids, among the ones asked for, of processors that are still alive in
 * that environment. Anything missing from the answer either never existed or was
 * soft-deleted, which is what makes its webhook an orphan.
 */
async function findLiveProcessors(
  metabaseToken: string,
  databaseId: number,
  processorIds: string[]
): Promise<Set<string>> {
  const quoted = processorIds.map((id) => `'${id}'`).join(',');
  const response = await axios.post(
    `${METABASE_API}/api/dataset`,
    {
      type: 'native',
      native: {
        query: `SELECT id FROM merchant_payment_processor WHERE id IN (${quoted}) AND deleted_at IS NULL`,
      },
      database: databaseId,
    },
    { headers: { 'X-Metabase-Session': metabaseToken }, timeout: 60_000 }
  );

  if (response.data?.error) {
    throw new Error(`Metabase query failed: ${response.data.error}`);
  }

  return new Set<string>((response.data?.data?.rows ?? []).map((row: string[]) => row[0]));
}

async function classify(
  app: PaypalApp,
  webhooks: PaypalWebhook[],
  hosts: string[] | null
): Promise<ClassifiedWebhook[]> {
  const classified: ClassifiedWebhook[] = webhooks.map((webhook) => {
    let host = '';
    try {
      host = new URL(webhook.url).host;
    } catch {
      host = '(unparseable url)';
    }

    const processorId = PROCESSOR_ID_FROM_URL.exec(webhook.url)?.[1] ?? null;
    const mapping = HOST_TO_METABASE_CARD[host];

    let reason = '';
    if (!mapping) reason = 'host has no database mapping';
    else if (!processorId) reason = 'url carries no processor id';
    else if (hosts && !hosts.includes(host)) reason = 'host excluded by --host';

    return {
      ...webhook,
      app: app.name,
      host,
      env: mapping?.env ?? '(unmapped)',
      processorId,
      status: 'UNKNOWN' as WebhookStatus,
      reason,
    };
  });

  const checkable = classified.filter((webhook) => !webhook.reason);
  if (checkable.length === 0) return classified;

  const metabaseToken = await getMetabaseToken();
  const byHost = new Map<string, ClassifiedWebhook[]>();
  for (const webhook of checkable) {
    byHost.set(webhook.host, [...(byHost.get(webhook.host) ?? []), webhook]);
  }

  for (const [host, hostWebhooks] of byHost) {
    try {
      const databaseId = await resolveDatabaseId(metabaseToken, HOST_TO_METABASE_CARD[host].cardId);
      const live = await findLiveProcessors(
        metabaseToken,
        databaseId,
        hostWebhooks.map((webhook) => webhook.processorId as string)
      );

      for (const webhook of hostWebhooks) {
        const isLive = live.has(webhook.processorId as string);
        webhook.status = isLive ? 'ACTIVE' : 'ORPHAN';
        webhook.reason = isLive ? 'processor is alive' : 'processor deleted or missing';
      }
    } catch (error) {
      // A failed lookup must never be read as "orphan" — leaving a live webhook in
      // place costs a slot, deleting a live one breaks a running test.
      for (const webhook of hostWebhooks) {
        webhook.reason = `lookup failed: ${(error as Error).message}`;
      }
    }
  }

  return classified;
}

function report(app: PaypalApp, webhooks: ClassifiedWebhook[]): void {
  console.log(
    `\nPayPal app ${app.name} (${app.description}) webhooks: ${webhooks.length} of ${SLOTS_PER_APP} slots used\n`
  );

  for (const webhook of webhooks) {
    const processor = webhook.processorId ?? '(none)';
    console.log(
      `  [${webhook.status.padEnd(6)}] ${webhook.env.padEnd(10)} ${processor}  ${webhook.reason}`
    );
  }

  const counts = webhooks.reduce<Record<string, number>>((accumulator, webhook) => {
    accumulator[webhook.status] = (accumulator[webhook.status] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(
    `\n  ACTIVE: ${counts.ACTIVE ?? 0}   ORPHAN: ${counts.ORPHAN ?? 0}   UNKNOWN: ${counts.UNKNOWN ?? 0}\n`
  );
}

interface AppListing {
  app: PaypalApp;
  token: string;
  webhooks: ClassifiedWebhook[];
}

/**
 * Deletes the confirmed orphans of one app (or only reports them on a dry run) and
 * returns how many of its slots are taken afterwards.
 */
async function releaseOrphans(listing: AppListing, options: Options): Promise<number> {
  const { app, token, webhooks } = listing;
  const orphans = webhooks.filter((webhook) => webhook.status === 'ORPHAN');

  if (!options.delete) {
    console.log(
      orphans.length > 0
        ? `[${app.name}] Dry run — ${orphans.length} orphan(s) would be deleted. Re-run with --delete to free the slots.`
        : `[${app.name}] Dry run — nothing to delete.`
    );
    return webhooks.length;
  }

  if (orphans.length > options.maxDelete) {
    throw new Error(
      `Refusing to delete ${orphans.length} webhooks: over the --max-delete=${options.maxDelete} safety cap.`
    );
  }

  let deleted = 0;
  for (const orphan of orphans) {
    try {
      await deleteWebhook(token, orphan.id);
      deleted++;
      console.log(`  [${app.name}] deleted ${orphan.id} (${orphan.env} / ${orphan.processorId})`);
    } catch (error) {
      console.error(`  [${app.name}] FAILED to delete ${orphan.id}: ${(error as Error).message}`);
    }
  }

  console.log(`\n[${app.name}] Freed ${deleted} of ${orphans.length} slot(s).`);
  return webhooks.length - deleted;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apps = PAYPAL_APPS.filter((app) => !options.apps || options.apps.includes(app.name));

  // Each app is cleaned on its own: a failure in one (bad credentials, a PayPal
  // outage) must not leave the other's orphans in place. The run still exits non-zero.
  const failures: string[] = [];
  const fail = (app: PaypalApp, error: unknown) => {
    const message = `${app.name}: ${(error as Error).message}`;
    failures.push(message);
    console.error(`[paypal-webhook-janitor] ${message}`);
  };

  const listings: AppListing[] = [];
  for (const app of apps) {
    try {
      const token = await getPaypalToken(app);
      const webhooks = await classify(app, await listWebhooks(token), options.hosts);
      listings.push({ app, token, webhooks });
    } catch (error) {
      fail(app, error);
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        listings.flatMap((listing) => listing.webhooks),
        null,
        2
      )
    );
  } else {
    for (const listing of listings) report(listing.app, listing.webhooks);
  }

  // Stable, greppable lines for CI: how many slots are taken once this run is
  // done. It is what decides whether the next regression has room, so it is
  // always printed after any deletion, never from the listing alone. The plain
  // SLOTS_IN_USE line carries the fullest app, which is the one that blocks first.
  let fullest: number | null = null;
  for (const listing of listings) {
    try {
      const inUse = await releaseOrphans(listing, options);
      console.log(`SLOTS_IN_USE_${listing.app.name.toUpperCase()}=${inUse}/${SLOTS_PER_APP}`);
      fullest = Math.max(fullest ?? 0, inUse);
    } catch (error) {
      fail(listing.app, error);
    }
  }

  if (fullest !== null) console.log(`SLOTS_IN_USE=${fullest}/${SLOTS_PER_APP}`);

  if (failures.length > 0) {
    throw new Error(`${failures.length} app(s) failed: ${failures.join('; ')}`);
  }
}

main().catch((error) => {
  console.error(`[paypal-webhook-janitor] ${error.message}`);
  process.exit(1);
});
