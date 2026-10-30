import axios, { AxiosResponse, AxiosError } from 'axios';

const urlApiMetabase = 'https://insights.deuna.com';
const userName = process.env.METABASE_USER;
const password = process.env.METABASE_PASSWORD;

interface TestCaseKey {
  TEST_CASE_KEY: string;
}

export default class MetabaseService {
  static async getToken(): Promise<string> {
    const body = {
      username: userName,
      password: password,
    };
    try {
      const response: AxiosResponse = await axios.post(`${urlApiMetabase}/api/session`, body);
      const token = response.data.id;
      return token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error(
            'An error occurred while getting token the Metabase request, status code is: ',
            axiosError.response.status
          );
          console.error(
            'An error occurred while getting token the Metabase request, response is:',
            axiosError.response.data
          );
        } else {
          console.error(
            'An error unknown occurred while  getting token the Metabase request, message is: ',
            axiosError.message
          );
        }
      }
      throw error;
    }
  }

  async getTestCases(queryId: string): Promise<TestCaseKey[]> {
    const tokenMetabase = await MetabaseService.getToken();
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Metabase-Session': tokenMetabase,
      };

      const response: AxiosResponse<TestCaseKey[]> = await axios.post(
        `${urlApiMetabase}/api/card/${queryId}/query/json`,
        '',
        { headers }
      );
      console.info(`-----> The query in metabase was executed successfully`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error(
            'An error occurred while executing the Metabase request, status code is: ',
            axiosError.response.status
          );
          console.error(
            'An error occurred while executing the Metabase request, response is:',
            axiosError.response.data
          );
        } else {
          console.error(
            'An error unknown occurred while executing the Metabase request, message is: ',
            axiosError.message
          );
        }
      }
    }
  }
}
