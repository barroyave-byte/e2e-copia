#!/usr/bin/env node

/**
 * Zephyr Scale Test Case Generator CLI
 *
 * Command-line interface for creating test cases in Zephyr Scale from JSON files.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ZephyrScaleClient } from './zephyr-scale-client';

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), `../../.env`),
});

/**
 * Parse command line arguments for Zephyr Scale command
 */
function parseArgs(): {
  jsonPath: string | null;
  projectKey: string | null;
  outputPath: string | null;
  folderId: string | null;
} {
  const args = process.argv.slice(2);
  let jsonPath: string | null = null;
  let projectKey: string | null = null;
  let outputPath: string | null = null;
  let folderId: string | null = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json' || arg === '-j') {
      jsonPath = args[++i] || null;
    } else if (arg === '--project' || arg === '-p') {
      projectKey = args[++i] || null;
    } else if (arg === '--output' || arg === '-o') {
      outputPath = args[++i] || null;
    } else if (arg === '--folder' || arg === '-d') {
      folderId = args[++i] || null;
    } else if (!arg.startsWith('-') && !jsonPath) {
      // First non-option argument is considered the JSON file path
      jsonPath = arg;
    }
  }

  return { jsonPath, projectKey, outputPath, folderId };
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log('Zephyr Scale Test Case Generator');
  console.log('');
  console.log('Usage:');
  console.log('  zephyr-scale-cli [JSON_FILE] --project [PROJECT_KEY] [options]');
  console.log('');
  console.log('Required arguments:');
  console.log('  --json, -j           Path to JSON file with test cases');
  console.log('  --project, -p        Jira project key');
  console.log('');
  console.log('Optional arguments:');
  console.log('  --output, -o         Output file path for results JSON');
  console.log('  --folder, -d         Zephyr Scale folder ID');
  console.log('  --help, -h           Show this help message');
  console.log('');
  console.log('Environment variables:');
  console.log('  ZEPHYR_SCALE_API_TOKEN    API token for Zephyr Scale (required)');
  console.log('');
  console.log('Examples:');
  console.log('  zephyr-scale-cli test-cases.json --project ADM --output results.json');
  console.log('  zephyr-scale-cli --json test-cases.json --project ADM');
}

/**
 * Main function for Zephyr Scale CLI
 */
async function main(): Promise<void> {
  try {
    // Check for help flag
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showHelp();
      process.exit(0);
    }

    // Parse command line arguments
    const { jsonPath, projectKey, outputPath, folderId } = parseArgs();
    console.log(`JSON path: ${jsonPath}`);
    console.log(`Project key: ${projectKey}`);

    // Validate required parameters
    if (!jsonPath) {
      console.error('Error: You must provide a JSON file with test cases');
      console.log('Use --help for usage information');
      process.exit(1);
    }

    if (!projectKey) {
      console.error('Error: Project key is required (--project or -p)');
      console.log('Use --help for usage information');
      process.exit(1);
    }

    // Get environment variables
    const zephyrToken = process.env.ZEPHYR_ACCESS_TOKEN;
    const zephyrScaleUser = process.env.USER_ID_ZEPHYR;

    if (!zephyrToken) {
      console.error('Error: ZEPHYR_ACCESS_TOKEN environment variable is required');
      console.log('Please set this variable in your .env file or environment');
      process.exit(1);
    }

    if (!zephyrScaleUser) {
      console.error('Error: USER_ID_ZEPHYR environment variable is required');
      console.log('Please set this variable in your .env file or environment');
      process.exit(1);
    }

    // Ensure JSON file exists
    if (!fs.existsSync(jsonPath!)) {
      console.error(`Error: JSON file not found: ${jsonPath}`);
      process.exit(1);
    }

    // Create a new ZephyrScaleClient instance
    const zephyrClient = new ZephyrScaleClient(zephyrToken, zephyrScaleUser);

    console.log(`Creating test cases in Zephyr Scale from JSON file: ${jsonPath}`);
    const results = await zephyrClient.createTestCasesFromJsonFile(
      jsonPath,
      projectKey,
      folderId || undefined
    );

    console.log(`Successfully created ${results.length} test cases in Zephyr Scale`);
    console.log(`Test cases created: ${JSON.stringify(results)}`);
    // Save results to output file if specified
    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Results saved to ${outputPath}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error creating test cases in Zephyr Scale:', error.message);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
