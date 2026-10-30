// requestHandler.ts
import envConfig from '@support/envConfig';
import { APIRequestContext, APIResponse, request } from '@playwright/test';
import {
  getMetabaseQueryIdByQueryName,
  QA_CYBERSOURCE_HTTP_STATUS_CODE,
  QA_EXTERNAL_TRANSACTION_ID_UPPER_CASE_CLEARSALE_INT,
  QA_GET_INVOICE,
  QA_GET_INVOICES_RESPONSE,
  QA_GET_REQUEST_RESPONSE_CYBERSOURCE,
  QA_GET_THREE_DS_FLOW_STEP_IDS,
  QA_GET_TRANSACTION_LOGS_BY_TRANSACTION_ID,
  QA_GET_TRANSACTIONS,
  QA_GET_TRANSACTIONS_SETTLEMENT,
  QA_MATCH_GUARD_SIFT_API_KEYS,
  QA_REFUND_VOID_CAPTURE_OPS,
  QA_VERIFY_POST_AUTHORIZATION,
  QA_VERIFY_POST_TRANSACTION_EVENT,
} from './metabaseUrls';

interface RequestOptions {
  headers?: Record<string, string>;
  data?: Record<string, any>;
  params?: URLSearchParams;
  timeout?: number;
}

interface ResponseData {
  status: number;
  statusText: string;
  body: any;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * Makes an HTTP request using Playwright.
 *
 * @param {HttpMethod} method - The HTTP method (GET, POST, PUT, DELETE, etc.).
 * @param {string} url - The URL to which the request is made.
 * @param {RequestOptions} [options] - The options for the request (headers, data, params, etc.).
 * @returns {Promise<ResponseData>} - The response from the request.
 */
export async function makeRequest(
  method: HttpMethod,
  url: string,
  options: RequestOptions = {}
): Promise<ResponseData> {
  const context: APIRequestContext = await request.newContext();
  let response: APIResponse;
  try {
    const requestOptions: any = {
      headers: options.headers,
      data: options.data,
      params: options.params,
      timeout: options.timeout,
    };
    console.log(`Request: ${method.toUpperCase()} ${url}`);
    console.log('Headers:', JSON.stringify(requestOptions.headers, null, 2));
    console.log('Data:', JSON.stringify(requestOptions.data, null, 2));
    response = await context[method.toLowerCase()](url, requestOptions);
    const responseText = await response.text();
    let responseBody: any;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // A gateway error page (502/504 HTML) used to surface as "SyntaxError: Unexpected token '<'",
      // hiding the status that explains the failure.
      throw new Error(
        `${method.toUpperCase()} ${url} returned a non-JSON response (HTTP ${response.status()}): ${responseText.slice(0, 200)}`
      );
    }
    console.log('Response:', JSON.stringify(responseBody, null, 2));
    return {
      status: response.status(),
      statusText: response.statusText(),
      body: responseBody,
    };
  } catch (error) {
    console.error('Error making request:', error);
    throw error;
  } finally {
    await context.dispose();
  }
}

/**
 * Retrieves the session token for Metabase.
 * @returns The session token as a string.
 * @throws An error if the token cannot be obtained.
 */
export const getMetabaseSessionToken = async (): Promise<string> => {
  const options = {
    data: {
      username: envConfig.MB_USER,
      password: envConfig.MB_PASSWORD,
    },
  } as RequestOptions;
  const responseToken = await makeRequest('POST', envConfig.MB_SESSION_TOKEN_URL, options);
  if (responseToken.status != 200) {
    throw new Error('No se pudo obtener el token para metabase');
  }
  return responseToken.body.id;
};

/**
 * Executes a Metabase query to verify that the Sift API keys received from the payment request
 * match the keys sent by the fraud system to Sift.
 *
 * @param orderId - The transaction ID used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getApiKeysFromMetabaseQueryForComparison = async (
  orderId: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_MATCH_GUARD_SIFT_API_KEYS);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to verify that the transaction doesnt have rows attached in
 * transaction_log table.
 *
 * @param orderId - The transaction ID used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getTransactionLogsByTransactionID = async (orderId: string): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_TRANSACTION_LOGS_BY_TRANSACTION_ID);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query
 *
 * @param queryId - The ID of the Metabase query to be executed.
 * @param options - The options for the request (headers, data, params, etc.).
 * @returns A Promise resolving to the API response containing the query results.
 */
export const executeMetabaseQuery = async (
  queryId: number,
  options: RequestOptions
): Promise<ResponseData> => {
  const token = await getMetabaseSessionToken();
  const headers = {
    'Content-type': 'application/json',
    'X-Metabase-Session': token,
    ...options.headers, // Add the headers from the options parameter
  };
  const requestOptions = {
    ...options,
    headers,
  };
  return await makeRequest(
    'POST',
    `https://insights.deuna.com/api/card/${queryId}/query`,
    requestOptions
  );
};

/**
 * Executes a Metabase query to verify that the Sift API keys received from the payment request
 * match the keys sent by the fraud system to Sift.
 *
 * @param orderId - The transaction ID used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getCybersourceStatusCodeFromMetabaseQuery = async (
  orderId: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_CYBERSOURCE_HTTP_STATUS_CODE);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to get the transactions settlement.
 *
 * @param order_token - The order token used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getTransactionsSettlementQuery = async (
  order_token: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_TRANSACTIONS_SETTLEMENT);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'order_token']],
          value: order_token,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to get the invoice.
 *
 * @param orderToken - The order token used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getInvoiceQuery = async (
  orderToken: string,
  orderID: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_INVOICE);
  var order_token = orderToken;
  if (orderToken === null || orderToken === undefined || orderToken.trim() === '') {
    order_token = '10000000-0000-0000-0000-000000000001';
  }
  var transaction_id = orderID;
  if (orderID === null || orderID === undefined || orderID.trim() === '') {
    transaction_id = '-----';
  }
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'order_token']],
          value: order_token,
        },
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: transaction_id,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to get the transactions.
 *
 * @param invoice_id - The invoice ID used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getTransactionsQuery = async (invoice_id: string): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_TRANSACTIONS);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'invoice_id']],
          value: invoice_id,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

export const getExternalTransactionIdUpperCaseFromMetabaseQuery = async (
  orderId: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(
    QA_EXTERNAL_TRANSACTION_ID_UPPER_CASE_CLEARSALE_INT
  );
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to verify that the Sift API keys received from the payment request
 * match the keys sent by the fraud system to Sift.
 *
 * @param orderToken - The transaction token used to filter the query results.
 * @param operationType - The type of operation to filter the query results. Allowed values are 'refund', 'void', 'capture'.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getEnqueueAsyncTaskFromDB = async (
  orderToken: string,
  operationType: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_REFUND_VOID_CAPTURE_OPS);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'order_token']],
          value: orderToken,
        },
        {
          type: 'text',
          target: ['variable', ['template-tag', 'operation_type']],
          value: operationType,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Retrieves the post-authorization flow data for a given order ID.
 *
 * @param orderId - The ID of the order for which to retrieve the post-authorization flow data.
 * @param timeout - Optional request timeout in ms. Without it, a request made inside a test has no
 * timeout and a hung Metabase query blocks until the test timeout.
 * @returns A promise that resolves to the response data of the post-authorization flow.
 */
export const getPostAuthorizationFlow = async (
  orderId: string,
  timeout?: number
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_VERIFY_POST_AUTHORIZATION);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
    timeout,
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

/**
 * Executes a Metabase query to verify that the Cybersource API keys received from the payment request
 * match the keys sent by the fraud system to Cybersource.
 *
 * @param orderId - The transaction ID used to filter the query results.
 * @returns A Promise resolving to the API response containing the query results.
 */
export const getRequestResponseCybersource = async (orderId: string): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_REQUEST_RESPONSE_CYBERSOURCE);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

export const getInvoicesResponse = async (orderToken: string): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_INVOICES_RESPONSE);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'order_token']],
          value: orderToken,
        },
      ],
    },
  } as RequestOptions;
  return await executeMetabaseQuery(queryId, options);
};

export const getQAVerifyPostTransactionEventQuery = async (
  orderId: string
): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_VERIFY_POST_TRANSACTION_EVENT);
  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'transaction_id']],
          value: orderId,
        },
      ],
    },
  } as RequestOptions;
  console.log('Query ID:', queryId);
  console.log('Options:', options);
  return await executeMetabaseQuery(queryId, options);
};

export const getThreeDsFlowAuthIDsQuery = async (invoiceId: string): Promise<ResponseData> => {
  const queryId = getMetabaseQueryIdByQueryName(QA_GET_THREE_DS_FLOW_STEP_IDS);

  const options = {
    data: {
      parameters: [
        {
          type: 'text',
          target: ['variable', ['template-tag', 'invoice_id']],
          value: invoiceId,
        },
      ],
    },
  } as RequestOptions;

  return await executeMetabaseQuery(queryId, options);
};
