#!/usr/bin/env node

/**
 * Zephyr Scale API Client
 *
 * This class handles parsing markdown test case files and creating test cases in Zephyr Scale
 * using their REST API: https://support.smartbear.com/zephyr-scale-cloud/api-docs/#tag/Test-Cases
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface ZephyrScaleTestCase {
  projectKey: string;
  name: string;
  objective: string; // Description
  precondition?: string;
  folderId?: string;
  priorityName?: string;
  statusName?: string;
  labels?: string[];
  customFields?: Record<string, any>;
  steps?: ZephyrScaleTestStep[];
}

interface ZephyrScaleTestStep {
  description: string;
  expectedResult?: string;
  testData?: string;
}

/**
 * Client for interacting with Zephyr Scale API
 */
export class ZephyrScaleClient {
  private apiBaseUrl: string;
  private axiosInstance: AxiosInstance;
  private userId: string;

  /**
   * Creates a new ZephyrScale API client
   *
   * @param apiToken - Zephyr Scale API token
   * @param baseUrl - Base URL for the Zephyr Scale API (default: https://api.zephyrscale.smartbear.com/v2)
   */
  constructor(
    apiToken: string,
    userId: string,
    baseUrl: string = 'https://api.zephyrscale.smartbear.com/v2'
  ) {
    this.apiBaseUrl = baseUrl;
    this.userId = userId;
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Post test steps for a test case in Zephyr Scale
   *
   * @param testSteps - Test steps in Zephyr Scale format
   * @param testCaseKey - Test case key in Zephyr Scale format
   * @returns Created test case response
   */
  public async postTestSteps(testSteps: any, testCaseKey: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        `/testcases/${testCaseKey}/teststeps`,
        testSteps
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating test case in Zephyr Scale:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to create test case in Zephyr Scale: ${error.message}`);
    }
  }

  /**
   * Create a test case in Zephyr Scale
   *
   * @param testCase - Test case in Zephyr Scale format
   * @returns Created test case response
   */
  public async createTestCase(testCase: ZephyrScaleTestCase): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/testcases', testCase);
      return response.data.key;
    } catch (error: any) {
      console.error('Error creating test case in Zephyr Scale:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to create test case in Zephyr Scale: ${error.message}`);
    }
  }

  /**
   * Create test cases from a JSON file
   *
   * @param filePath - Path to JSON file
   * @param projectKey - Jira project key
   * @param folderId - Optional folder ID in Zephyr Scale
   * @returns Array of created test case responses
   */
  public async createTestCasesFromJsonFile(
    filePath: string,
    projectKey: string,
    folderId?: string
  ): Promise<any[]> {
    console.log(`Parsing JSON file: ${filePath}`);
    let jsonCases: any[] = [];
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      jsonCases = JSON.parse(fileContent);
      if (!Array.isArray(jsonCases)) {
        throw new Error('JSON file must contain an array of test case objects');
      }
    } catch (error: any) {
      console.error(`Error reading or parsing JSON file: ${error.message}`);
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }

    const results: any[] = [];
    for (let idx = 0; idx < jsonCases.length; idx++) {
      const testCaseObj = jsonCases[idx];
      // Validate minimal required fields
      if (!testCaseObj.projectKey || !testCaseObj.name || !testCaseObj.objective) {
        console.error(
          `Test case at index ${idx} missing required fields (projectKey, name, objective)`
        );
        continue;
      }
      // Override projectKey and folderId if provided by CLI
      testCaseObj.projectKey = projectKey || testCaseObj.projectKey;
      testCaseObj.ownerId = this.userId;
      try {
        const testCaseKey = await this.createTestCase(testCaseObj);
        const testCaseTitle = `${testCaseKey} ${testCaseObj.name}`;
        console.log(`Successfully created test case ${testCaseTitle}`);
        await this.postTestSteps(testCaseObj.steps, testCaseKey);
        results.push(testCaseTitle);
      } catch (error) {
        console.error(`Failed to create test case: ${testCaseObj.name}`);
        throw error;
      }
    }
    return results;
  }
}
