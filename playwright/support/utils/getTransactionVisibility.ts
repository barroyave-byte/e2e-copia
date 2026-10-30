import * as apiCallNewman from '@support/newman/apiCallNewman';
import { JSONPath } from 'jsonpath-plus';

export class TransactionVisibilityService {
  /**
   * Calls the callPostmanCollection function (passing the orderId) to obtain the JSON,
   * and uses jsonpath-plus to execute the provided query on that JSON.
   *
   * @param orderId - Transaction identifier to query.
   * @param jsonPathQuery - Query in JSONPath format (e.g., "$..data" or "$..cvv2").
   * @returns The result of executing the query on the obtained JSON.
   */
  async getValueByPath(
    orderId: string,
    jsonPathQuery: string,
    merchantId: string,
    merchantToken: string
  ): Promise<any> {
    // Retrieve JSON from the Postman collection
    const jsonResponse = await apiCallNewman.execGetTransactionVisibility(
      orderId,
      merchantId,
      merchantToken
    );
    console.log(`-----> The JSON response is: ${JSON.stringify(jsonResponse)}`);
    // Use JSONPath to extract the value(s) based on the query
    const result = JSONPath({ path: jsonPathQuery, json: jsonResponse });
    return result;
  }
}
