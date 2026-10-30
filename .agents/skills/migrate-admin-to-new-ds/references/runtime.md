# Runtime: ADMIN_URL, local admin-ff, Playwright

Load this before the first test run.

## Bind ADMIN_URL

1. If the user passed `ADMIN_URL`, use it as-is. Do not start Vite.
2. If omitted:
   - Probe `http://localhost:5173`. If it responds, reuse it.
   - Else in the resolved admin-ff repo run `pnpm dev` (Vite, port 5173). Wait until that origin responds.
   - If `pnpm dev` fails (deps, CodeArtifact `pnpm login`, port in use by a non-Vite process), interrogate. Do not guess another port.
3. Never write e2e-testing `.env` or `.env.*`.
4. Pass the URL only to the Playwright **child process**: `ADMIN_URL=<url>`.
5. Do not kill the server at the end, including one you started.
6. If this session **created** a `data-testid` in admin-ff and `ADMIN_URL` is not local, interrogate (switch to local vs leave blocked). Do not claim green for that locator against a remote admin.

`envConfig.ADMIN_URL` reads `process.env.ADMIN_URL` (fallback `https://admin.stg.deuna.io`). e2e-testing `.env` often already has `http://localhost:5173`; still pass the env var explicitly so the run does not depend on file mutation.

## Playwright

Functional specs:

```bash
ADMIN_URL=<url> npx playwright test <ID-or-path> --project=chromium
```

`@visual` specs:

```bash
ADMIN_URL=<url> npx playwright test <ID-or-path> --project=visual-testing --grep @visual
```

Do not pass `--update-snapshots` unless the user chose that interrogation path.

Run **one spec at a time**. Do not fan out workers across the given list.

IDs resolve to `playwright/tests/**/<ID>.spec.ts` (`testDir` is `./playwright/tests`). The filename must match the `@ID` inside the file.

Traces live under Playwright's output (`retain-on-failure` locally). Use the trace / error locator when the static inventory did not predict the failure (dynamic testid, portal, iframe, timing).
