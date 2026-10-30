#!/usr/bin/env ts-node
/**
 * Filter a list of test IDs by team relevance.
 *
 * Usage:
 *   npx ts-node scripts/filter-tests-by-team.ts --team checkout --file regression-ids.txt
 *   npx ts-node scripts/filter-tests-by-team.ts --team checkout QA-T1 PI-T629 PAYM-T2166
 *   npx ts-node scripts/filter-tests-by-team.ts --team checkout --file ids.txt --irrelevant-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { isRelevantForTeam, availableTeams } from '../playwright/support/teamFilters';

const TESTS_DIR = path.resolve(__dirname, '..', 'playwright', 'tests');

function findTestFile(testId: string): string | null {
  const target = `${testId}.spec.ts`;
  const walk = (dir: string): string | null => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const found = walk(path.join(dir, entry.name));
        if (found) return found;
      } else if (entry.name === target) {
        return path.join(dir, entry.name);
      }
    }
    return null;
  };
  return walk(TESTS_DIR);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let team = '';
  let file = '';
  let irrelevantOnly = false;
  const ids: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--team') team = args[++i];
    else if (args[i] === '--file') file = args[++i];
    else if (args[i] === '--irrelevant-only') irrelevantOnly = true;
    else ids.push(args[i]);
  }

  return { team, file, irrelevantOnly, ids };
}

function main() {
  const { team, file, irrelevantOnly, ids } = parseArgs();

  if (!team) {
    console.error(`Error: --team is required. Available: ${availableTeams().join(', ')}`);
    process.exit(1);
  }

  if (!availableTeams().includes(team.toLowerCase())) {
    console.error(`Error: unknown team "${team}". Available: ${availableTeams().join(', ')}`);
    process.exit(1);
  }

  const inputIds = [...ids];
  if (file) {
    const lines = fs
      .readFileSync(file, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    inputIds.push(...lines);
  }

  if (inputIds.length === 0) {
    console.error('Error: provide at least one test ID (via args or --file).');
    process.exit(1);
  }

  const relevant: { id: string; file: string }[] = [];
  const irrelevant: { id: string; file: string }[] = [];
  const notFound: string[] = [];

  for (const id of inputIds) {
    const filePath = findTestFile(id);
    if (!filePath) {
      notFound.push(id);
      continue;
    }
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
    if (isRelevantForTeam(team, filePath)) {
      relevant.push({ id, file: relPath });
    } else {
      irrelevant.push({ id, file: relPath });
    }
  }

  if (!irrelevantOnly) {
    console.log(`\n=== Team Filter: ${team} ===`);
    console.log(`Input: ${inputIds.length} IDs\n`);

    console.log(`✅ RELEVANT — include in ${team} review (${relevant.length}):`);
    if (relevant.length === 0) console.log('  (none)');
    for (const t of relevant) console.log(`  ${t.id.padEnd(16)} ${t.file}`);

    console.log(`\n❌ IRRELEVANT — ignore in ${team} review (${irrelevant.length}):`);
    if (irrelevant.length === 0) console.log('  (none)');
    for (const t of irrelevant) console.log(`  ${t.id.padEnd(16)} ${t.file}`);

    if (notFound.length > 0) {
      console.log(`\n⚠️  NOT FOUND (${notFound.length}):`);
      for (const id of notFound) console.log(`  ${id}`);
    }

    console.log(
      `\nSummary: ${relevant.length} relevant / ${irrelevant.length} irrelevant / ${notFound.length} not found`
    );
  } else {
    for (const t of irrelevant) console.log(t.id);
  }
}

main();
