import axios, { AxiosResponse, AxiosError } from 'axios';
import { TestCase } from '@playwright/test/reporter';
import { TestCaseZephyr } from '../models/testCaseZephyr';
import { TestCycle, TestCycleResponse } from '../models/testCycle';
import { JIRA_API_URL, JIRA_API_TOKEN, JIRA_AUTH_USER } from '../utils/config';

/**
 * Outcome of a publish attempt. `publishTestCase` used to return `undefined` on
 * failure, which the caller could not tell apart from a successful call that
 * returned no id — so it logged "published successfully" after a 400.
 */
export interface PublishResult {
  ok: boolean;
  executionId?: number;
  testCaseKey: string;
  /** HTTP status when the server answered; absent for transport-level errors. */
  httpStatus?: number;
  error?: string;
}

export class ZephyrService {
  private urlApiZephyr: string;
  private accessToken: string;

  constructor(urlApiZephyr: string, accessToken: string) {
    this.urlApiZephyr = urlApiZephyr;
    this.accessToken = accessToken;
  }

  async createTestCycle(testCycleData: TestCycle): Promise<string> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };

    try {
      const response: AxiosResponse<TestCycleResponse> = await axios.post<TestCycleResponse>(
        `${this.urlApiZephyr}/v2/testcycles`,
        testCycleData,
        { headers }
      );
      return response.data?.key;
    } catch (error) {
      console.error('Error creating test cycle:', error.response?.data || error.message);
      throw error;
    }
  }

  async publishTestCase(testCase: TestCaseZephyr): Promise<PublishResult> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };

    // A missing key is a caller bug, not a transport failure. Posting it anyway
    // is what produced one `testCaseKey: must not be null` 400 per shard.
    if (!testCase.testCaseKey) {
      const error = 'testCaseKey is empty; refusing to publish';
      console.log(`[ERROR] ZEPHYR SCALE - ${error}`);
      return { ok: false, testCaseKey: testCase.testCaseKey, error };
    }

    try {
      const response: AxiosResponse<TestCycleResponse> = await axios.post<TestCycleResponse>(
        `${this.urlApiZephyr}/v2/testexecutions`,
        testCase,
        { headers }
      );
      return { ok: true, executionId: response.data?.id, testCaseKey: testCase.testCaseKey };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.log(
            `[ERROR] ZEPHYR SCALE - Publishing ${testCase.testCaseKey} failed with status code: `,
            axiosError.response.status
          );
          console.log('Response data: ', axiosError.response.data);
          return {
            ok: false,
            testCaseKey: testCase.testCaseKey,
            httpStatus: axiosError.response.status,
            error: JSON.stringify(axiosError.response.data),
          };
        }
        console.log(
          `[ERROR] ZEPHYR SCALE - The request to publish test case ${testCase.testCaseKey} failed: ${axiosError.message}`
        );
        return { ok: false, testCaseKey: testCase.testCaseKey, error: axiosError.message };
      }

      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[ERROR] ZEPHYR SCALE - Unexpected error publishing ${testCase.testCaseKey}: ${message}`
      );
      return { ok: false, testCaseKey: testCase.testCaseKey, error: message };
    }
  }

  async linkIssueToTestCase(testCase: TestCase, testExecutionId: number): Promise<void> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };

    const issueKey = this.getIssueKey(testCase);
    const issueId = await this.getIssueId(issueKey);

    const issueIdData = {
      issueId: issueId,
    };

    try {
      await axios.post(
        `${this.urlApiZephyr}/v2/testexecutions/${testExecutionId}/links/issues`,
        issueIdData,
        { headers }
      );
      console.log(
        `[INFO] ZEPHYR SCALE - The issue ${issueKey} was linked to the test case ${testCase.title}`
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.log(
            'Request Zephyr Issues link failed with status code: ',
            axiosError.response.status
          );
          console.log('Response data: ', axiosError.response.data);
        } else {
          console.log('The request to issue link test case failed: ', axiosError.message);
        }
      }
    }
  }

  getIssueKey(testCase: TestCase): string {
    return testCase.annotations.find((a) => a.type === 'bug')?.description;
  }

  async getIssueId(issueKey: string): Promise<void> {
    const url = `${JIRA_API_URL}/issue/${issueKey}`;
    const auth = Buffer.from(`${JIRA_AUTH_USER}:${JIRA_API_TOKEN}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    try {
      const response: AxiosResponse = await axios.get(url, { headers });
      console.log(`[INFO] ZEPHYR SCALE - The id of the issue ${issueKey} is: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.log('Request failed with status code: ', axiosError.response.status);
          console.log('Response data: ', axiosError.response.data);
        } else {
          console.log('The request failed: ', axiosError.message);
        }
      }
    }
  }

  async setTestSteps(testCaseId: string, body: any): Promise<void> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };

    console.log(`test case id: ${testCaseId}, body: ${JSON.stringify(body)}`);

    try {
      const response = await axios.post(
        `${this.urlApiZephyr}/v2/testcases/${testCaseId}/teststeps`,
        body,
        { headers }
      );
      console.log(`response data ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.log('Request Set Steps failed with status code: ', axiosError.response.status);
          console.log('Response data: ', axiosError.response.data);
        } else {
          console.log('The request failed: ', axiosError.message);
        }
      }
    }
  }

  async getStepsAmount(testCaseId: string): Promise<number> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };

    try {
      const response = await axios.get(
        `${this.urlApiZephyr}/v2/testcases/${testCaseId}/teststeps`,
        { headers }
      );
      return response.data?.total;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.log('Request Get Steps failed with status code: ', axiosError.response.status);
          console.log('Response data: ', axiosError.response.data);
        } else {
          console.log('The request failed: ', axiosError.message);
        }
      }
    }
  }
}

export default ZephyrService;
