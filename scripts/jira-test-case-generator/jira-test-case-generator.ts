#!/usr/bin/env node

/**
 * Jira Test Case Generator
 *
 * This script takes a Jira issue key as input, queries the Jira API for issue details,
 * analyzes the information, and generates test cases based on the issue content.
 *
 * The generated test cases are saved to a file in JSON or CSV format.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Types
export interface TestCase {
  title: string;
  description: string;
  preconditions: string;
  steps: string[];
  priority: 'High' | 'Medium' | 'Low';
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: string;
    issuetype: {
      name: string;
    };
    priority: {
      name: string;
    };
    customfield_10062?: string; // Acceptance Criteria field
    [key: string]: any;
  };
}

/**
 * Jira API Client for fetching issue data
 */
export class JiraClient {
  private jiraBaseUrl: string;
  private authValue: string;
  private axiosInstance: ReturnType<typeof axios.create>;

  constructor(jiraBaseUrl: string, jiraToken: string, jiraUser: string) {
    this.jiraBaseUrl = jiraBaseUrl;
    this.authValue = Buffer.from(`${jiraUser}:${jiraToken}`).toString('base64');
    this.axiosInstance = axios.create({
      baseURL: this.jiraBaseUrl,
      headers: {
        Authorization: `Basic ${this.authValue}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch issue data from Jira API with all fields
   */
  async getIssue(issueId: string): Promise<JiraIssue> {
    try {
      const response = await this.axiosInstance.get(`/rest/api/2/issue/${issueId}`);
      return response.data as JiraIssue;
    } catch (error: any) {
      console.error(`Failed to fetch Jira issue ${issueId}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to fetch Jira issue ${issueId}`);
    }
  }
}

/**
 * Main function to run the script
 */
async function main(): Promise<void> {
  try {
    // Get Jira issue ID from command line argument
    const jiraIssueId = process.argv[2];

    if (!jiraIssueId) {
      console.error(
        'Error: Jira issue ID is required. Usage: npm run generate-test-cases <JIRA_ISSUE_ID>'
      );
      process.exit(1);
    }
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
