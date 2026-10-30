#!/usr/bin/env node
/**
 * generate-manifest.js
 *
 * Usage (two modes):
 *   node scripts/generate-manifest.js                  # runs playwright --list internally
 *   node scripts/generate-manifest.js /tmp/pw.json     # reads a pre-generated JSON file
 *
 * The second mode avoids ENOBUFS on large suites. Pre-generate with:
 *   npx playwright test --list --reporter=json --project=chromium > /tmp/pw.json 2>/dev/null
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── 1. Load raw Playwright JSON ──────────────────────────────────────────────

let raw;
const inputArg = process.argv[2];

if (inputArg) {
  // Read from pre-generated file (safe for large suites)
  raw = fs.readFileSync(path.resolve(inputArg), 'utf-8');
} else {
  // Run playwright --list inline with a large buffer (50 MB)
  raw = execSync('npx playwright test --list --reporter=json --project=chromium', {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

// dotenvx escribe líneas antes del JSON. Buscamos el inicio real del objeto.
// El JSON de Playwright empieza con una línea que solo contiene '{'.
const jsonStart = raw.indexOf('\n{');
if (jsonStart === -1 && !raw.trimStart().startsWith('{')) {
  console.error('ERROR: No se encontró JSON válido en el input.');
  console.error('Asegúrate de generarlo con: npx playwright test --list --reporter=json');
  process.exit(1);
}
const pw = JSON.parse(jsonStart === -1 ? raw.trim() : raw.slice(jsonStart).trim());

// ── 2. Recorrer suites recursivamente ────────────────────────────────────────

/**
 * Playwright's JSON reporter nests suites inside suites when tests live inside
 * test.describe() blocks. This walks the full tree and collects all specs.
 */
function collectSpecs(suite) {
  const results = [];

  if (suite.specs && suite.specs.length > 0) {
    for (const spec of suite.specs) {
      results.push(spec);
    }
  }

  if (suite.suites && suite.suites.length > 0) {
    for (const child of suite.suites) {
      results.push(...collectSpecs(child));
    }
  }

  return results;
}

const allSpecs = (pw.suites ?? []).flatMap(collectSpecs);

// ── 3. Filtrar y construir entradas ──────────────────────────────────────────

// Playwright devuelve tags SIN '@'. Los normalizamos para que el consumidor
// siempre reciba "@i-hub-global", "@smoke", etc.
function normalizeTags(tags) {
  return (tags ?? []).map((t) => (t.startsWith('@') ? t : `@${t}`));
}

// Solo incluimos tests etiquetados con @i-hub-* (global o específicos de PSP).
// El manifest NO es una lista completa — es un índice curado para i-hub.
const ZEPHYR_ID_RE = /@([A-Z][A-Z0-9]+-T\d+)/;

const seen = new Set();
const tests = [];

for (const spec of allSpecs) {
  const normalizedTags = normalizeTags(spec.tags);

  // Buscar el tag @i-hub-* (si no tiene, este test no pertenece al manifest)
  const ihubTag = normalizedTags.find((t) => t.startsWith('@i-hub-'));
  if (!ihubTag) continue;

  // Extraer ID de Zephyr del título
  const idMatch = spec.title.match(ZEPHYR_ID_RE);
  if (!idMatch) continue;

  const id = idMatch[1];
  if (seen.has(id)) continue; // deduplicar (mismo spec aparece en múltiples proyectos)
  seen.add(id);

  tests.push({
    id,
    file: spec.file,
    ihub_tag: ihubTag,
    tags: normalizedTags,
    title: spec.title
      .replace(ZEPHYR_ID_RE, '')
      .replace(/^\s*@?\s*/, '')
      .trim(),
  });
}

// ── 4. Escribir manifest ─────────────────────────────────────────────────────

const manifest = {
  generated_at: new Date().toISOString(),
  schema_version: '2',
  total: tests.length,
  tests,
};

const outPath = path.join(process.cwd(), 'test-manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

const globals = tests.filter((t) => t.ihub_tag === '@i-hub-global').length;
const specifics = tests.filter((t) => t.ihub_tag !== '@i-hub-global').length;
console.log(`Manifest generado: ${tests.length} tests con @i-hub-* → ${outPath}`);
console.log(`  @i-hub-global: ${globals}`);
console.log(`  @i-hub-{psp}:  ${specifics}`);
