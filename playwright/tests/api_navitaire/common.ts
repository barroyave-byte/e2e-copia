import * as xml from 'fast-xml-parser';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { sleep } from '@tests/order_builder/order_functions';
import { TestStepInfo } from '@playwright/test';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { NavitaireMerchantConfig } from '@support/http/models/navitaire';

/**
 * Generates a random confirmation ID consisting of 3 uppercase letters followed by 3 digits.
 * Example output: "ABC123"
 *
 * @returns {string} The generated confirmation ID as a string.
 */
export const generateConfirmationId = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 3 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
  const randomDigits = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');
  return `${randomLetters}${randomDigits}`;
};

/**
 * Generates a random payment ID consisting of 9 digits.
 * Example output: "123456789"
 *
 * @returns {string} The generated payment ID as a string.
 */
export const generatePaymentId = (): string => {
  return Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
};

/**
 * Creates a new Navitaire merchant via the navitaire-middleware REST API.
 *
 * Creates the merchant with random initial credentials, updates it with
 * the final credentials, and confirms the merchant is retrievable.
 *
 * @returns {Promise<NavitaireCredentials>} The credentials used to authenticate SOAP requests.
 */
export const createNavitaireMerchant = async (
  merchantId: string,
  privateKey: string,
  merchantToken: string,
  extraConfig?: Partial<NavitaireMerchantConfig> | null
): Promise<NavitaireCredentials> => {
  const navitaireService = ServiceFactory.getService(SERVICE_KEYS.NAVITAIRE);

  const defaultConfig: NavitaireMerchantConfig = {
    channel_market_type_mapping: { direct: 'MOTO' },
  };

  const credentials: NavitaireCredentials = {
    username: randomUUID(),
    password: faker.internet.password(),
  };

  const createResponse = await navitaireService.createMerchant(merchantToken, {
    username: faker.string.uuid(),
    password: faker.internet.password(),
    name: faker.company.name(),
    merchant_id: merchantId,
    private_api_key: privateKey,
    configuration: extraConfig ?? defaultConfig,
  });

  const navitaireMerchantId = createResponse.data.id;

  await navitaireService.updateMerchant(merchantToken, navitaireMerchantId, {
    username: credentials.username,
    password: credentials.password,
  });

  await navitaireService.getMerchant(merchantToken, navitaireMerchantId);

  console.log('[INFO] ----> Navitaire Merchant Credentials: ', credentials);
  return credentials;
};

/**
 * Retrieves and validates transaction visibility trace logs for a given transaction.
 *
 * This function:
 * - Waits for transaction logs to become available.
 * - Calls the TRANSACTION_VISIBILITY Postman collection to fetch trace logs for the specified transaction ID.
 * - Parses the logs and optionally checks that all provided event names are present in the logs.
 * - Throws an error if the logs are missing or if not all expected event names are found.
 *
 * @param {string} transactionId - The ID of the transaction to retrieve logs for.
 * @param {string[]} [eventNames] - Optional array of event names that must be present in the logs.
 * @returns {Promise<TraceLog[]>} - Resolves with the array of trace log objects.
 * @throws {Error} - If logs are missing or required event names are not found.
 */
export const checkTraceLogs = async (
  step: TestStepInfo,
  transactionId: string,
  merchantId: string,
  merchantToken: string,
  eventNames: string[] = []
): Promise<TraceLog[]> => {
  step.skip(skipCheckTraceLogs(), skipCheckTraceLogsMsg);

  await sleep(5000); // wait for transaction logs to be available

  console.log('[INFO] ----> transaction_id: ', transactionId);

  const transactionTraceService = ServiceFactory.getService(SERVICE_KEYS.TRANSACTION_TRACE);
  const tvResult = await transactionTraceService.getTransactionVisibilityLogs(
    transactionId,
    'transaction_visibility',
    merchantId,
    merchantToken
  );

  const traceLogs: TraceLog[] = tvResult.data as unknown as TraceLog[];
  const traceLogsEventNames: string[] = traceLogs.flatMap((log) => {
    const name = log?.metadata?.transaction_visibility?.event_name;
    return typeof name === 'string' ? [name] : [];
  });

  if (traceLogsEventNames.length !== 0) {
    const assureEventNames = eventNames.every((eventName) =>
      traceLogsEventNames.includes(eventName)
    );
    if (!assureEventNames) {
      console.log(`[ERROR] ----> Expected event names: ${eventNames.join(', ')}`);
      console.log(`[ERROR] ----> Found event names: ${traceLogsEventNames.join(', ')}`);
      throw new Error('[ERROR] ----> Not all assured event names are present in the trace logs.');
    }
  }

  return traceLogs;
};

/**
 * Extracts the device fingerprint from the transaction visibility logs.
 *
 * This function searches the provided logs for an entry with the event name 'tv_incoming_purchase'
 * and returns the associated device fingerprint if present.
 *
 * @param {TraceLog[]} logs - Array of trace log objects to search.
 * @returns {string} The device fingerprint if found, otherwise an empty string.
 */
export const getFingerprintFromLogs = (logs: TraceLog[]): string => {
  const traceLog = logs.find(
    (entry) => entry.metadata?.transaction_visibility?.event_name === 'tv_incoming_purchase'
  );
  if (!traceLog) return '';

  return (
    traceLog.metadata?.transaction_visibility?.payload?.request_data?.antiFraudInfo?.device
      ?.fingerprint || ''
  );
};

/**
 * Extracts the PaymentIdentification object from the transaction visibility logs.
 *
 * This function searches the provided logs for an entry with the event name 'tv_navitaire_authorize'
 * and returns the associated PaymentIdentification object if present.
 *
 * @param {TraceLog[]} logs - Array of trace log objects to search.
 * @returns {PaymentIdentification | null} The PaymentIdentification object if found, otherwise null.
 */
export const getPaymentIdentificationFromLogs = (
  logs: TraceLog[]
): PaymentIdentification | null => {
  const traceLog = logs.find(
    (entry) => entry.metadata?.transaction_visibility?.event_name === 'tv_navitaire_authorize'
  );
  if (!traceLog) return null;

  return (
    traceLog.metadata?.transaction_visibility?.payload?.request_data?.Parameters?.Request
      ?.BaseRequest?.PaymentIdentification || null
  );
};

/**
 * Parses the Navitaire SOAP authorize XML response and returns the AuthorizeResult object.
 *
 * @param {string} xmlData - Raw XML string returned by the navitaire authorize endpoint.
 * @returns The parsed AuthorizeResult object.
 */
export const getAuthorizeResult = (xmlData: string) => {
  const parser = new xml.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const parsedXml = parser.parse(xmlData);
  const authorizeResult =
    parsedXml['env:Envelope']['env:Body']['AuthorizeResponse']['AuthorizeResult'];
  console.log('[INFO] ----> Authorize Result: ', authorizeResult);
  return authorizeResult;
};

/**
 * Parses the Navitaire SOAP reverse XML response and returns the ReverseResult object.
 *
 * @param {string} xmlData - Raw XML string returned by the navitaire reverse endpoint.
 * @returns The parsed ReverseResult object.
 */
export const getReverseResult = (xmlData: string) => {
  const parser = new xml.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const parsedXml = parser.parse(xmlData);
  const reverseResult = parsedXml['env:Envelope']['env:Body']['ReverseResponse']['ReverseResult'];
  console.log('[INFO] ----> Reverse Result: ', reverseResult);
  return reverseResult;
};

/**
 * Returns true if trace logs checks should be skipped based on conditions such as environment.
 */
export const skipCheckTraceLogs = (): boolean => {
  // Trace logs are currently not functional in the preprod. When this is resolved, the workaround can be removed.
  if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
    return true;
  }

  // Since order notifications v2 is the default and there is no way to create a configuration with
  // api requests, skip the trace logs checks. See https://deuna.atlassian.net/browse/PLAT-6572.
  return true;
};
export const skipCheckTraceLogsMsg = 'Trace logs checks are skipped at the moment';

export type NavitaireCredentials = {
  username: string;
  password: string;
};

export interface TraceLog {
  metadata?: {
    transaction_visibility?: {
      event_name?: string;
      payload?: {
        request_data?: {
          Parameters?: {
            Request?: {
              BaseRequest?: {
                PaymentIdentification?: PaymentIdentification;
              };
            };
          };
          antiFraudInfo?: {
            device?: {
              fingerprint?: string;
            };
          };
        };
      };
    };
  };
}

export interface PaymentIdentification {
  ClientConfirmationId: string;
  ClientPaymentId: string;
  ClientProductId: string;
}
