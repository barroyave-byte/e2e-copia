#!/usr/bin/env node

/**
 * Jira Test Case Generator CLI
 *
 * Command-line interface for generating test cases from Jira issues.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Parse command line arguments
 */
function parseArgs(): {
  jiraIssueId: string | null;
  format: 'json' | 'csv';
  outputPath: string;
} {
  const args = process.argv.slice(2);
  let jiraIssueId: string | null = null;
  let format: 'json' | 'csv' = 'json';
  let outputPath = '';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--format' || arg === '-f') {
      const formatValue = args[++i]?.toLowerCase();
      if (formatValue === 'json' || formatValue === 'csv') {
        format = formatValue;
      } else {
        console.error(`Invalid format: ${formatValue}. Using default: json`);
      }
    } else if (arg === '--output' || arg === '-o') {
      outputPath = args[++i] || '';
    } else if (!arg.startsWith('-') && !jiraIssueId) {
      // First non-option argument is considered the Jira issue ID
      jiraIssueId = arg;
    }
  }

  // Set default output path if not provided
  if (!outputPath) {
    outputPath = path.join(process.cwd(), `testcases.${format}`);
  }

  return { jiraIssueId, format, outputPath };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const { jiraIssueId, format, outputPath } = parseArgs();

    // Get environment variables
    const jiraToken =
      process.env.JIRA_API_TOKEN ||
      'ATATT3xFfGF0Run3F8iVmkJonDbCEgE8txw1w2J1Bu9PzuT8UWuuO9KEuvrv1gTEfgglbJsmJ2dBi009q_Yu8TBLEHWXdetU-KrHj3tZogf8ok1jv3SN0RAroybatEuaWhemxupvPqN7AUO3hY3bFz03WiASi4TTwYlpCNxA2k8sbzpgSzvniJo=1226FB82';
    const jiraUser = process.env.JIRA_AUTH_USER || 'jnovoa@deuna.com';
    const jiraBaseUrl = process.env.JIRA_BASE_URL || 'https://deuna.atlassian.net';

    console.log(`Fetching information for Jira issue: ${jiraIssueId}`);
    console.log(`Output format: ${format}`);
    console.log(`Output path: ${outputPath}`);

    // Import JiraClient from jira-test-case-generator.ts
    const { JiraClient } = await import('./jira-test-case-generator');

    // Create a new JiraClient instance
    const jiraClient = new JiraClient(jiraBaseUrl, jiraToken, jiraUser);

    // Get issue information
    console.log(`Connecting to Jira API at ${jiraBaseUrl}...`);
    const issueData = await jiraClient.getIssue(jiraIssueId);
    console.log(`Successfully retrieved data for issue ${jiraIssueId}`);

    // Save issue data to output file
    fs.writeFileSync(outputPath, JSON.stringify(issueData, null, 2));
    console.log(`Issue data saved to ${outputPath}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error running test case generator:', error.message);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
