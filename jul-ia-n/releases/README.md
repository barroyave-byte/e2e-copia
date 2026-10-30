# Reviewed release CSVs (ai-heal cross-release comparison)

One file per release, committed **manually** once QA/dev finish reviewing it (`QA Review` +
`Root cause QA` columns filled in) — see `jul-ia-n/PIPELINE.md` for the full mechanism.

## Naming convention

The filename must embed a `<YYYY>-<major>.<minor>` release number somewhere in it, e.g.:

```
Test Results Release 2026-30.2 - Template.csv
```

`npm run ai-heal` and `npm run ai-heal:compare-release` pick the most recent file by **parsing that
release number and comparing numerically** (year, then major, then minor) — not by plain filename
string sort, and not by file modification time (a fresh CI checkout resets mtimes for every file, so
that can't be used to tell which release CSV is newest). Numeric comparison means digit width doesn't
matter — `30.10` is correctly picked over `30.2` — which a plain string sort would get backwards.

A file with no `<YYYY>-<major>.<minor>` pattern in its name is skipped (logged as a warning) when
picking the latest baseline.

## How to promote a new baseline

Once a release's CSV has been reviewed:

```bash
cp path/to/reviewed-release.csv "jul-ia-n/releases/Test Results Release 2026-31.1 - Template.csv"
git add "jul-ia-n/releases/Test Results Release 2026-31.1 - Template.csv"
git commit -m "ai-heal: promote 31.1 as cross-release comparison baseline"
```

The next `npm run ai-heal` run (in CI or locally) automatically picks it up — no other configuration
needed. Older files are kept for history; nothing here is ever deleted automatically.
