#!/usr/bin/env ts-node
/**
 * API Coverage Calculator
 *
 * Compares OpenAPI specifications against test files to calculate
 * what percentage of API endpoints are covered by E2E tests.
 *
 * Usage:
 *   npx ts-node scripts/api-coverage/api-coverage.ts
 *   npx ts-node scripts/api-coverage/api-coverage.ts --json
 *   npx ts-node scripts/api-coverage/api-coverage.ts --output report.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// ============================================================================
// Types
// ============================================================================

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, any>>;
}

interface Endpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  source: string; // which OpenAPI file
}

interface CoverageResult {
  endpoint: Endpoint;
  covered: boolean;
  foundIn: string[];
}

interface CoverageReport {
  generatedAt: string;
  summary: {
    totalEndpoints: number;
    coveredEndpoints: number;
    coveragePercentage: number;
  };
  bySource: Record<
    string,
    {
      total: number;
      covered: number;
      percentage: number;
    }
  >;
  byMethod: Record<
    string,
    {
      total: number;
      covered: number;
      percentage: number;
    }
  >;
  byTag: Record<
    string,
    {
      total: number;
      covered: number;
      percentage: number;
    }
  >;
  coveredEndpoints: CoverageResult[];
  uncoveredEndpoints: CoverageResult[];
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  openApiFiles: ['resources/openapi-apigateway.json', 'resources/openapi-middleware.yaml'],
  testDirectories: [
    'playwright/tests',
    'playwright/support/http/services',
    'playwright/support/newman',
    'playwright/support/api_sup',
  ],
  testFilePatterns: ['**/*.ts'],
  excludePatterns: ['**/node_modules/**', '**/*.d.ts'],
  // Paths to ignore in coverage (health checks, internal endpoints, etc.)
  ignorePaths: ['/health', '/ping', '/ready', '/live'],
};

// ============================================================================
// OpenAPI Parser
// ============================================================================

function parseYaml(content: string): any {
  // Simple YAML parser for OpenAPI files
  // For production, use a proper YAML library like js-yaml
  const lines = content.split('\n');
  const result: any = {};
  const stack: { indent: number; obj: any; key?: string }[] = [{ indent: -1, obj: result }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed
        .substring(0, colonIndex)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value === '' || value === '|' || value === '>') {
        parent[key] = {};
        stack.push({ indent, obj: parent[key], key });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        parent[key] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        parent[key] = value.replace(/^['"]|['"]$/g, '');
      }
    } else if (trimmed.startsWith('- ')) {
      const parentKey = stack[stack.length - 1].key;
      if (parentKey && !Array.isArray(parent)) {
        const grandparent = stack[stack.length - 2]?.obj;
        if (grandparent) {
          grandparent[parentKey] = [];
          stack[stack.length - 1].obj = grandparent[parentKey];
        }
      }
      if (Array.isArray(stack[stack.length - 1].obj)) {
        stack[stack.length - 1].obj.push(
          trimmed
            .substring(2)
            .trim()
            .replace(/^['"]|['"]$/g, '')
        );
      }
    }
  }

  return result;
}

function loadOpenApiSpec(filePath: string): OpenApiSpec | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    if (filePath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      // Use dynamic import for yaml if available, otherwise use simple parser
      try {
        const yaml = require('js-yaml');
        return yaml.load(content);
      } catch {
        // Fallback to simple parser - may not handle all YAML features
        console.warn(`Warning: js-yaml not installed, using simple parser for ${filePath}`);
        return parseYaml(content) as OpenApiSpec;
      }
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return null;
}

function extractEndpoints(spec: OpenApiSpec, source: string): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

  if (!spec.paths) return endpoints;

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    // Skip ignored paths
    if (CONFIG.ignorePaths.some((p) => pathKey.toLowerCase().includes(p.toLowerCase()))) {
      continue;
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!httpMethods.includes(method.toLowerCase())) continue;

      endpoints.push({
        path: pathKey,
        method: method.toUpperCase(),
        operationId: operation?.operationId,
        summary: operation?.summary,
        tags: operation?.tags || [],
        source,
      });
    }
  }

  return endpoints;
}

// ============================================================================
// Test File Analyzer
// ============================================================================

function normalizeEndpointPath(path: string): string {
  // Normalize path parameters: /users/{id} -> /users/:id -> /users/[^/]+
  return path.replace(/\{[^}]+\}/g, '[^/]+').replace(/:[a-zA-Z_]+/g, '[^/]+');
}

function analyzeTestFile(filePath: string, endpoints: Endpoint[]): Map<string, string[]> {
  const coverage = new Map<string, string[]>();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const endpoint of endpoints) {
      const endpointKey = `${endpoint.method} ${endpoint.path}`;

      // Create regex patterns to find endpoint usage
      const pathPattern = normalizeEndpointPath(endpoint.path);
      const patterns = [
        // Direct path string
        new RegExp(`['"\`]${pathPattern}['"\`]`, 'i'),
        // URL pattern with method
        new RegExp(
          `method:\\s*['"\`]${endpoint.method}['"\`].*url:\\s*['"\`][^'"\`]*${pathPattern}`,
          'is'
        ),
        new RegExp(
          `url:\\s*['"\`][^'"\`]*${pathPattern}.*method:\\s*['"\`]${endpoint.method}['"\`]`,
          'is'
        ),
        // axios/fetch style
        new RegExp(`\\.${endpoint.method.toLowerCase()}\\s*\\(['"\`][^'"\`]*${pathPattern}`, 'i'),
        // BaseHttpClient style
        new RegExp(`method:\\s*['"\`]${endpoint.method}['"\`]`, 'i'),
      ];

      // Also check for the path without method for simpler matching
      const pathOnlyPattern = new RegExp(pathPattern.replace(/\//g, '\\/'), 'i');

      const matches =
        patterns.some((p) => p.test(content)) ||
        (pathOnlyPattern.test(content) &&
          content.toLowerCase().includes(endpoint.method.toLowerCase()));

      if (matches) {
        const existing = coverage.get(endpointKey) || [];
        existing.push(filePath);
        coverage.set(endpointKey, existing);
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
  }

  return coverage;
}

// ============================================================================
// Coverage Calculator
// ============================================================================

async function calculateCoverage(): Promise<CoverageReport> {
  const projectRoot = path.resolve(__dirname, '../..');

  // Load all OpenAPI specs
  console.log('\n📋 Loading OpenAPI specifications...');
  const allEndpoints: Endpoint[] = [];

  for (const file of CONFIG.openApiFiles) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  File not found: ${file}`);
      continue;
    }

    const spec = loadOpenApiSpec(filePath);
    if (spec) {
      const endpoints = extractEndpoints(spec, file);
      allEndpoints.push(...endpoints);
      console.log(`  ✅ ${file}: ${endpoints.length} endpoints`);
    }
  }

  console.log(`\n📊 Total endpoints to analyze: ${allEndpoints.length}`);

  // Find all test files
  console.log('\n🔍 Scanning test files...');
  const testFiles: string[] = [];

  for (const dir of CONFIG.testDirectories) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) continue;

    for (const pattern of CONFIG.testFilePatterns) {
      const files = await glob(path.join(dirPath, pattern), {
        ignore: CONFIG.excludePatterns,
      });
      testFiles.push(...files);
    }
  }

  console.log(`  📁 Found ${testFiles.length} test files`);

  // Analyze coverage
  console.log('\n🔬 Analyzing coverage...');
  const coverageMap = new Map<string, string[]>();

  let processed = 0;
  for (const testFile of testFiles) {
    const fileCoverage = analyzeTestFile(testFile, allEndpoints);
    for (const [key, files] of fileCoverage) {
      const existing = coverageMap.get(key) || [];
      coverageMap.set(key, [...new Set([...existing, ...files])]);
    }
    processed++;
    if (processed % 100 === 0) {
      process.stdout.write(`\r  Processed ${processed}/${testFiles.length} files...`);
    }
  }
  console.log(`\r  ✅ Processed ${testFiles.length} files          `);

  // Build results
  const results: CoverageResult[] = allEndpoints.map((endpoint) => {
    const key = `${endpoint.method} ${endpoint.path}`;
    const foundIn = coverageMap.get(key) || [];
    return {
      endpoint,
      covered: foundIn.length > 0,
      foundIn: foundIn.map((f) => path.relative(projectRoot, f)),
    };
  });

  // Calculate statistics
  const coveredResults = results.filter((r) => r.covered);
  const uncoveredResults = results.filter((r) => !r.covered);

  // By source
  const bySource: Record<string, { total: number; covered: number; percentage: number }> = {};
  for (const result of results) {
    const source = result.endpoint.source;
    if (!bySource[source]) {
      bySource[source] = { total: 0, covered: 0, percentage: 0 };
    }
    bySource[source].total++;
    if (result.covered) bySource[source].covered++;
  }
  for (const key of Object.keys(bySource)) {
    bySource[key].percentage =
      Math.round((bySource[key].covered / bySource[key].total) * 100 * 10) / 10;
  }

  // By method
  const byMethod: Record<string, { total: number; covered: number; percentage: number }> = {};
  for (const result of results) {
    const method = result.endpoint.method;
    if (!byMethod[method]) {
      byMethod[method] = { total: 0, covered: 0, percentage: 0 };
    }
    byMethod[method].total++;
    if (result.covered) byMethod[method].covered++;
  }
  for (const key of Object.keys(byMethod)) {
    byMethod[key].percentage =
      Math.round((byMethod[key].covered / byMethod[key].total) * 100 * 10) / 10;
  }

  // By tag
  const byTag: Record<string, { total: number; covered: number; percentage: number }> = {};
  for (const result of results) {
    const tags = result.endpoint.tags?.length ? result.endpoint.tags : ['Untagged'];
    for (const tag of tags) {
      if (!byTag[tag]) {
        byTag[tag] = { total: 0, covered: 0, percentage: 0 };
      }
      byTag[tag].total++;
      if (result.covered) byTag[tag].covered++;
    }
  }
  for (const key of Object.keys(byTag)) {
    byTag[key].percentage = Math.round((byTag[key].covered / byTag[key].total) * 100 * 10) / 10;
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEndpoints: allEndpoints.length,
      coveredEndpoints: coveredResults.length,
      coveragePercentage: Math.round((coveredResults.length / allEndpoints.length) * 100 * 10) / 10,
    },
    bySource,
    byMethod,
    byTag,
    coveredEndpoints: coveredResults,
    uncoveredEndpoints: uncoveredResults,
  };
}

// ============================================================================
// Report Formatters
// ============================================================================

function printConsoleReport(report: CoverageReport): void {
  const { summary, bySource, byMethod, byTag, uncoveredEndpoints } = report;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    API COVERAGE REPORT                        ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Generated: ${report.generatedAt.padEnd(51)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Endpoints: ${summary.totalEndpoints.toString().padEnd(45)}║`);
  console.log(
    `║ Covered: ${summary.coveredEndpoints} (${summary.coveragePercentage}%)`.padEnd(65) + '║'
  );
  console.log(
    `║ Not Covered: ${summary.totalEndpoints - summary.coveredEndpoints} (${(100 - summary.coveragePercentage).toFixed(1)}%)`.padEnd(
      65
    ) + '║'
  );
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  // By Source
  console.log('║ BY SOURCE                                                     ║');
  for (const [source, stats] of Object.entries(bySource)) {
    const line = `║   ${source}: ${stats.covered}/${stats.total} (${stats.percentage}%)`;
    console.log(line.padEnd(65) + '║');
  }
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  // By Method
  console.log('║ BY HTTP METHOD                                                ║');
  for (const [method, stats] of Object.entries(byMethod).sort((a, b) => b[1].total - a[1].total)) {
    const bar =
      '█'.repeat(Math.round(stats.percentage / 5)) +
      '░'.repeat(20 - Math.round(stats.percentage / 5));
    const line = `║   ${method.padEnd(7)} ${bar} ${stats.covered}/${stats.total} (${stats.percentage}%)`;
    console.log(line.padEnd(65) + '║');
  }
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  // Top uncovered by tag
  console.log('║ TOP UNCOVERED TAGS                                            ║');
  const sortedTags = Object.entries(byTag)
    .filter(([_, stats]) => stats.total - stats.covered > 0)
    .sort((a, b) => b[1].total - b[1].covered - (a[1].total - a[1].covered))
    .slice(0, 5);

  for (const [tag, stats] of sortedTags) {
    const uncovered = stats.total - stats.covered;
    const line = `║   ${tag}: ${uncovered} uncovered (${stats.percentage}% coverage)`;
    console.log(line.padEnd(65) + '║');
  }
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  // Sample uncovered endpoints
  console.log('║ SAMPLE UNCOVERED ENDPOINTS (first 10)                         ║');
  for (const result of uncoveredEndpoints.slice(0, 10)) {
    const ep = result.endpoint;
    const line = `║   ${ep.method.padEnd(7)} ${ep.path.substring(0, 50)}`;
    console.log(line.padEnd(65) + '║');
  }
  if (uncoveredEndpoints.length > 10) {
    console.log(`║   ... and ${uncoveredEndpoints.length - 10} more`.padEnd(65) + '║');
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const outputFileIndex = args.indexOf('--output');
  const outputFile = outputFileIndex >= 0 ? args[outputFileIndex + 1] : null;

  console.log('🚀 API Coverage Calculator');
  console.log('═'.repeat(50));

  const report = await calculateCoverage();

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printConsoleReport(report);
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${outputFile}`);
  }

  // Exit with error code if coverage is below threshold
  const threshold = 50;
  if (report.summary.coveragePercentage < threshold) {
    console.log(
      `\n⚠️  Coverage ${report.summary.coveragePercentage}% is below threshold ${threshold}%`
    );
    // process.exit(1); // Uncomment to fail CI
  }
}

main().catch(console.error);
