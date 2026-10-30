# PayPal webhook slots

## The constraint

PayPal caps a REST app at **10 webhooks**. DEUNA registers **one webhook per payment
processor** — `<notificationURL>/payconnect/<processorId>`, see
`payments/api/http/controllers/merchant_payment_processor.go:362` — for PayPal Wallet,
PayPal Pay Later and Venmo. Every environment uses the **same sandbox apps**, and the
suite uses two of them, each with its own 10 slots:

| App      | Processors                                         | Credentials the backend uses                            | Defined in                 |
| -------- | -------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `wallet` | `paypal_wallet` (56) and every variant (USD, MPC…) | `public_api_key` + `private_api_key` (`ASV7KQ…`)        | `paypalWalletProcessor.ts` |
| `spb`    | `paypal_pay_later` (149), `venmo` (165)            | `extra_params.client_id` + `private_api_key` (`ASgB_…`) | `paypalSpbProcessors.ts`   |

So each app's 10 slots are a single global budget shared by dev, staging, preprod,
every local run, and the backend's own Postman collection. The `wallet` app is the
busy one: around 30 specs create a processor that consumes one of its slots, the ones
under `playwright/tests/wallet/paypal_wallet` plus `PI-T2161` and `ADM-T806`. The
`spb` app is consumed by the Pay Later and Venmo specs (`ENTP1-T2564`, `ENTP1-T2565`),
and the PayPal Group specs (Wallet + Pay Later) take **one slot in each app**. PayPal
ACDC does not consume one — processor 53 registers no webhook.

The apps fill up independently: a full `spb` app breaks Pay Later and Venmo while the
`wallet` app has room, and the other way round.

When the budget runs out, processor creation fails with:

```
Create payment processor failed: {"code":"error.external_integration",
"description":"error creating webhook: WEBHOOK_NUMBER_LIMIT_EXCEEDED..."}
```

## Why the slots leak

Deleting a processor is supposed to delete its webhook, but that cleanup is
best-effort: `merchant-payment-processors/internal/application/merchant_payment_processor.go:553`
(`teardownExternalServices`) logs the failure and deletes the processor row anyway.
The webhook survives, and since the row is gone, **no cleanup that starts from the
database can find it**.

That is what happened on 2026-09-18: 10 processors were created and deleted in dev
within hours, and all 10 webhooks stayed behind. The app sat at 10/10 orphans for
four days, blocking staging, until they were removed on 2026-09-22.

## The janitor

`scripts/paypal-webhook-janitor.ts` starts from PayPal instead of the database. For
each app (`wallet` and `spb`, on their own):

1. Lists the webhooks that actually exist in the app.
2. Extracts the `processorId` from each URL and maps the host to its environment.
3. Asks that environment's database (through Metabase) which of those processors
   are still alive.
4. Reports — or, with `--delete`, removes — the ones whose processor is gone.

```bash
npm run paypal:janitor                        # report only (dry run)
npm run paypal:janitor -- --delete            # free the orphaned slots
npm run paypal:janitor -- --host api.stg.deuna.io
npm run paypal:janitor -- --app spb           # only one app (wallet | spb)
```

It prints one `SLOTS_IN_USE_<APP>=N/10` line per app after any deletion, and a final
`SLOTS_IN_USE=N/10` with the fullest app, which is the one that blocks first. CI reads
that last line.

Safety rules built in:

- Dry run by default; deletes only with an explicit `--delete`.
- A host with no database mapping (preprod, a local tunnel) is `UNKNOWN` and is
  **never** deleted — without a database there is no way to establish orphanhood.
- A failed Metabase lookup yields `UNKNOWN`, never `ORPHAN`. A read failure must
  never be read as "safe to delete".
- `--max-delete` (default 10, per app) aborts that app's deletion if more candidates
  appear than expected.
- A failure in one app (rejected credentials, a PayPal error) does not stop the other
  app from being cleaned; the run still exits non-zero.

Requires `METABASE_USER` / `METABASE_PASSWORD`. PayPal credentials come from
`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (`wallet`) and `PAYPAL_SPB_CLIENT_ID` /
`PAYPAL_SPB_CLIENT_SECRET` (`spb`) when set, otherwise from the committed sandbox
values of each processor config.

## Where it runs

| Where                                     | When                                     | Mode       |
| ----------------------------------------- | ---------------------------------------- | ---------- |
| `regression.yml`, job `resolve-selection` | Before the shard matrix, once per run    | `--delete` |
| `paypal_webhook_janitor.yml`              | Daily at 11:00 UTC, plus manual dispatch | `--delete` |

The regression step lives in `resolve-selection` because it is the only job that
runs **once for the whole run**. Playwright's `globalSetup` and `globalTeardown`
run once per `playwright test` invocation, and each shard is its own invocation on
its own machine — that is why a suite-wide hook for this cannot exist inside the
test runner.

Both runs clean orphans from **every** mapped environment, not just their own: a
webhook is only deleted when its processor is gone from that environment's database,
so the cleanup is safe regardless of who created it, and dev's leftovers are exactly
what blocks staging.

## What the janitor does not fix

It removes garbage; it does not reduce consumption. Still open:

1. **One PayPal app per environment.** Each app carries its own 10 slots. Needs
   access to the PayPal developer account that owns the current app.
2. **Pre-provisioned shared PayPal merchants.** Resolve a few fixed processors once,
   before the shard matrix, instead of one per spec: ~30 slots per run drops to 3.
   Implemented but never merged, in `QA-4303-paypal-webhooks` (this repo) and
   `QA-4303-paypal-webhooks-ga` (github-actions).
3. **Backend self-healing.** On `WEBHOOK_NUMBER_LIMIT_EXCEEDED`, reap orphans and
   retry; and stop discarding webhook-delete failures silently.

Until at least one of those lands, a regression can still exhaust the budget through
concurrency alone, with every slot legitimately in use at the same time.
