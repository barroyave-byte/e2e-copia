# Langfuse — local/dev self-host

Traces every `classify`/orchestrator/subagent LLM call from `jul-ia-n` (model, input, output, token
usage, cost, latency). Tracing is opt-in: if `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` aren't set in
the root `.env`, `util/tracing.ts` is a no-op and the pipeline behaves exactly as before.

`docker-compose.yml` here is Langfuse's own official self-host compose file (v3 — Postgres + ClickHouse
+ Redis + MinIO + langfuse-web + langfuse-worker), fetched from
`https://raw.githubusercontent.com/langfuse/langfuse/main/docker-compose.yml`, with one change: Postgres
is remapped to host port **5434** instead of 5432 (5432 is commonly already taken by a local Postgres
install — it was on the machine this was first set up on).

## First-time setup

```bash
cd jul-ia-n/infra/langfuse
cp .env.example .env   # then fill in real random values — see below
docker compose up -d
```

`.env` is gitignored (`.env*` in the repo root `.gitignore`) — **never commit it**. Generate real
secrets, don't use the placeholder defaults baked into `docker-compose.yml`:

```bash
openssl rand -hex 32   # ENCRYPTION_KEY
openssl rand -hex 16   # everything else (POSTGRES_PASSWORD, CLICKHOUSE_PASSWORD, MINIO_ROOT_PASSWORD,
                        # REDIS_AUTH, SALT, NEXTAUTH_SECRET, LANGFUSE_INIT_USER_PASSWORD)
```

**Two non-obvious gotchas** if you change any of the passwords above (found wiring this up):
1. `POSTGRES_PASSWORD` and the `DATABASE_URL` langfuse-web/worker actually connect with are **separate
   env vars with separate hardcoded defaults** in the upstream compose file — they don't automatically
   stay in sync. If you set `POSTGRES_PASSWORD`, you must also set `DATABASE_URL` to match (see
   `.env.example`), or langfuse-web fails migrations with `P1000: Authentication failed`.
2. Same issue for MinIO: `MINIO_ROOT_PASSWORD` is separate from the three
   `LANGFUSE_S3_*_SECRET_ACCESS_KEY` vars langfuse-web/worker use to talk to it. All four must match.

Set `LANGFUSE_INIT_ORG_ID` / `LANGFUSE_INIT_PROJECT_ID` / `LANGFUSE_INIT_PROJECT_PUBLIC_KEY` /
`LANGFUSE_INIT_PROJECT_SECRET_KEY` / `LANGFUSE_INIT_USER_*` to bootstrap an org + project + API keypair
+ user automatically on first boot — no manual UI click-through needed. Verify it worked:

```bash
curl -u "<LANGFUSE_INIT_PROJECT_PUBLIC_KEY>:<LANGFUSE_INIT_PROJECT_SECRET_KEY>" \
  http://localhost:3000/api/public/projects
```

Then copy those same two keys into the **root** `e2e-testing/.env` as `LANGFUSE_PUBLIC_KEY` /
`LANGFUSE_SECRET_KEY` (see `.env.template`) — that's what `util/tracing.ts` actually reads.

## UI

http://localhost:3000 — log in with `LANGFUSE_INIT_USER_EMAIL` / `LANGFUSE_INIT_USER_PASSWORD`.

## Ports

web 3000 · worker 3030 (localhost only) · postgres 5434→5432 (localhost only, remapped) · clickhouse
8123/9000 (localhost only) · minio 9090/9091 · redis 6379 (localhost only).

## Status (2026-07-28)

Local/dev only, per the CTO/CEO roadmap decision to start with Docker Compose before committing to a
real AWS target. Self-contained under `jul-ia-n/infra/` on purpose — this is exactly the kind of piece
that should move as-is when `jul-ia-n` gets extracted into its own repository.
