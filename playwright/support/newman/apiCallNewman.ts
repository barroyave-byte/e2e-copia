import { expect } from '@playwright/test';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { BaseUserAddressCreditCard } from '@support/interfaces/address_user';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import * as crypto from 'crypto';
import { CurrencyValues } from '../interfaces/currencyTypes';
import {
  BaseProcessor,
  ConnectionProcessorData,
} from '../interfaces/payment_processors/baseProcessor';
import { BaseUserData } from '../interfaces/user_data';
import * as updateResponse from '@support/interfaces/installments';

import { BaseValidationCapture } from '@support/interfaces/capture/baseValidationCapture';
import { BaseValidationRefund } from '@support/interfaces/refund/baseValidationRefund';
import { BaseValidationVoid } from '@support/interfaces/void/baseValidationVoid';

import envConfig, { allowedEnvironments } from '@support/envConfig';
import type { EmaService } from '@support/http/services/EmaService';
import type { TraceLogV2 } from '@support/http/services/TransactionTraceService';
import { MerchantUserV3RoleResponse } from '@support/interfaces/adminRolesAndPermissions';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { BaseValidationUser } from '@support/interfaces/user_data/baseValidationUser';
import { BaseValidationUserDevice } from '@support/interfaces/user_device/baseValidationUserDevice';
import {
  newElementsConfig,
  newThemeConfig,
  widgetsGeneralConfig,
} from '@support/mocks/newThemeConfig';
import {
  getInvoiceQuery,
  getThreeDsFlowAuthIDsQuery,
  getTransactionsQuery,
  getTransactionsSettlementQuery,
  makeRequest,
  getCybersourceStatusCodeFromMetabaseQuery,
  getApiKeysFromMetabaseQueryForComparison,
  getExternalTransactionIdUpperCaseFromMetabaseQuery,
} from '@support/request_helper/requestUtil';
import {
  ElementsConfig,
  ThemeConfig,
  WidgetsGeneralConfig,
} from '../interfaces/CheckoutConfigurationV2';
import exp = require('constants');
import {
  CaptureResponseV2,
  PurchaseRequestV2,
  PurchaseResponse,
  SERVICE_KEYS,
  ServiceFactory,
} from '@support/http';
import { ExternalEndpointData } from '@support/http/models/merchantAuth';
import {
  buildMerchantUserWithNetworkBody,
  buildMerchantUserWithoutNetworkBody,
  buildMerchantRoleBody,
} from '@support/http/testData/user_auth/MerchantUserDefaults';
import { InstallmentsCampaignData } from '@support/http/models/paymentMsi';
import { MethodType } from '@support/http/models/payment';
import { DEFAULT_CAMPAIGN_MSI } from '@support/http/testData/payment_msi/CampaignDefault';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { TokenizeOrderRequestData, TokenizeOrderResponse } from '@support/http/models/order';
import {
  ALLOW_STRIPE_DIRECT_CONFIGURATION,
  USE_DYNAMIC_ROUTING_ENABLED,
} from '@support/http/testData/payment/PaymentMerchantConfigurations';
import {
  SIGNIFYD_FRAUD_PROCESSOR_BODY,
  RISKIFIED_FRAUD_PROCESSOR_BODY,
  RISKIFIED_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  SIFT_FRAUD_PROCESSOR_BODY,
  SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  DYNAMIC_ROUTING_SIGNIFYD_RULE_BODY,
  DYNAMIC_ROUTING_RISKIFIED_RULE_BODY,
  DYNAMIC_ROUTING_SIFT_RULE_BODY,
  TRIM_RULE_IN_BODY,
  TRIM_EVALUATE_TRIGGER_BODY,
  CONTAINS_RULE_BODY,
  CONTAINS_EVALUATE_TRIGGER_BODY,
} from '@support/http/testData/dynamicRouting/FraudRoutingConfig';
import { createNavitaireMerchant } from '@tests/api_navitaire/common';
import { DEFAULT_CARD_DATA } from '@support/http/testData/user_card/CardDataBuilder';
import { DeunanowOrderBuilder } from '@support/http/testData/ema/DEUNANOW';
import { retryApiCall, retryGetOrderStatus, retryOnWebhookLimit } from '@support/utils/retries';

const urlApi = envConfig.BASE_URL_POSTMAN;

interface BaseValidation {
  statusCode: number;
  errorCode?: string;
  errorDescription?: string;
}

export interface ConfigurationV2 {
  customThemeConfig?: ThemeConfig;
  widgets_general_config?: WidgetsGeneralConfig;
  elementsConfig?: ElementsConfig;
}

interface NewmanCreateSubscriptionParams {
  planId: string;
  currency: string;
  privateKey: string;
}

interface PayerInfo {
  email: string;
  name: string;
  last_name: string;
  phone: string;
}

interface CreateSubscriptionResponse {
  id: string;
  external_subscription_id: string;
  plan_id: string;
  merchant_id: string;
  user_id: string;
  currency: string;
  name: string;
  amount: number;
  genesis_invoice_id: string;
  order_id: string;
  status: string;
  card_id: string;
  payer_info: PayerInfo;
  subscription_end_date: string;
  billing_cycle: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  order: unknown;
}

export async function loginGuest(merchantId: string, userId: string, apiKey: string): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const userTokenAuth = await userAuthService.loginAsGuest(merchantId, apiKey, userId);
  return userTokenAuth.data.token;
}

export async function createCheckoutConfigVault(
  merchantId: string,
  merchantToken: string,
  themeConfig = newThemeConfig,
  widgets_general_config = widgetsGeneralConfig,
  elementsConfig = newElementsConfig
): Promise<any> {
  const checkoutConfigurationService = ServiceFactory.getService(
    SERVICE_KEYS.CHECKOUT_CONFIGURATION
  );
  await checkoutConfigurationService.configVault({
    merchant_token: merchantToken,
    merchant_id: merchantId,
    config_vault_data: {
      config_checkout_data: {
        configuration: {
          exclude_billing_address: false,
          is_colorblind: false,
          is_identity_document_hide: false,
          hide_pickup_time: false,
        },
        image_url: '',
        theme: {
          main_color: '#5F529E',
          secondary_color: '#d9d4d4',
          background_color: '#FFFFFF',
        },
      },
      config_checkout_v2_data: {
        order_config: {
          notify_type: 'async',
          payment_link: {
            generate_user_auth_token: true,
          },
        },
        elements_config: elementsConfig,
        widgets_general_config: widgets_general_config,
      },
    },
  });
}

export async function createClickToPayWithElements(
  merchantId: string,
  merchantToken: string,
  themeConfig = newThemeConfig
): Promise<any> {
  const checkoutConfigService = ServiceFactory.getService(SERVICE_KEYS.CHECKOUT_CONFIGURATION);
  await checkoutConfigService.configClickToPay(merchantId, merchantToken, themeConfig);
}

export const createSplitPaymentWithClickToPay = async ({
  merchantId,
  merchantToken,
  config,
}: {
  merchantId: string;
  merchantToken: string;
  config?: {
    widgetGeneralConfig?: Partial<WidgetsGeneralConfig>;
  };
}) => {
  const checkoutConfigService = ServiceFactory.getService(SERVICE_KEYS.CHECKOUT_CONFIGURATION);
  await checkoutConfigService.configSplitPaymentWithClickToPay(merchantId, merchantToken, config);
};

export interface CreateConfigurationV2 {
  widgetGeneralsConfig?: object;
  elementsConfig?: object;
  orderConfig?: object;
}

export async function createConfigurationV2(
  { widgetGeneralsConfig, elementsConfig, orderConfig }: CreateConfigurationV2,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const checkoutConfigService = ServiceFactory.getService(SERVICE_KEYS.CHECKOUT_CONFIGURATION);
  await checkoutConfigService.createConfigCheckoutV2({
    merchant_id: merchantId,
    merchant_token: merchantToken,
    config_checkout_v2_data: {
      ...(orderConfig ? { order_config: orderConfig } : {}),
      widgets_general_config: widgetGeneralsConfig,
      elements_config: elementsConfig,
    },
  });
}

export async function createCheckoutModulesConfig(
  checkoutModules: CheckoutModule[],
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const checkoutConfigService = ServiceFactory.getService(SERVICE_KEYS.CHECKOUT_CONFIGURATION);
  await checkoutConfigService.createConfigCheckoutV2({
    merchant_id: merchantId,
    merchant_token: merchantToken,
    config_checkout_v2_data: { widgets_general_config: { checkout_modules: checkoutModules } },
  });
}

export async function LoadS3FileSettlementProcessedBucket(
  referenceID: string,
  folderName: string,
  processorId: string,
  fileContentBase64: string,
  merchantToken: string
): Promise<any> {
  const settlementService = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

  if (folderName === 'oxxo-reference') {
    return settlementService.uploadInternalFile('oxxo_reference', {
      file_content_base64: fileContentBase64,
    });
  }

  if (folderName === 'baz-reference') {
    return settlementService.uploadInternalFile('baz_reference', {
      file_content_base64: fileContentBase64,
    });
  }

  if (folderName === 'safetypay-express') {
    const now = new Date().toISOString().slice(0, 19);
    const safetypayBody = {
      ApiKey: '064520298754c5391f55a7ca5eaa5b67',
      RequestDateTime: now,
      MerchantSalesID: crypto.randomUUID(),
      ReferenceNo: referenceID,
      CreationDateTime: now,
      Amount: '50.00',
      CurrencyID: 'USD',
      PaymentReferenceNo: '589184',
      Status: '102',
      Signature: 'FB5DEA8F84DE1F8C9DBBF33E4900ECA1A143BFEEA44CCED5011CF15D25AE64D5',
    };
    return paymentService.sendWebhookByProcessorId(merchantToken, processorId, safetypayBody);
  }

  throw new Error(`LoadS3FileSettlementProcessedBucket: unknown folderName "${folderName}"`);
}

export async function createNetwork(merchantId: string, merchantToken: string): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const responseNetwork = await userAuthService.createNetworkAndAddMerchantToNetwork(
    merchantId,
    merchantToken
  );
  return {
    networkId: responseNetwork.network.id,
    networkName: responseNetwork.network.name,
  };
}

export async function addMerchantToNetwork(
  networkId: string,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  await userAuthService.addMerchantToNetwork({
    merchant_id: merchantId,
    network_id: networkId,
    merchantToken: merchantToken,
  });
}

export async function createMerchantUserV2WithNework(
  merchantRole: string,
  merchantStoreCode: string,
  merchantId: string,
  networkId: string,
  merchantToken: string
): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  return userAuthService.createMerchantUser(merchantToken, {
    email: `${crypto.randomUUID()}@testuser.com`,
    name: 'Test User',
    password: '123456',
    role: merchantRole,
    store_code: merchantStoreCode,
    merchants_ids: [merchantId],
    network_id: networkId,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  });
}

export async function createMerchantUserV2WithOutNework(
  merchantRole: string,
  merchantStoreCode: string,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  return userAuthService.createMerchantUser(merchantToken, {
    email: `${crypto.randomUUID()}@testuser.com`,
    name: 'Test User',
    password: '123456',
    role: merchantRole,
    store_code: merchantStoreCode,
    merchants_ids: [merchantId],
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  });
}

export const configureVaultWidget = async (
  merchantId: string,
  merchantToken: string,
  { customThemeConfig, widgets_general_config, elementsConfig }: ConfigurationV2 | undefined = {}
): Promise<any> => {
  await createCheckoutConfigVault(
    merchantId,
    merchantToken,
    customThemeConfig,
    widgets_general_config,
    elementsConfig
  );
  await createNetwork(merchantId, merchantToken);
};

export const configureWidget = async (
  merchantId: string,
  merchantToken: string,
  { customThemeConfig, widgets_general_config, elementsConfig }: ConfigurationV2 | undefined = {}
): Promise<any> => {
  await createCheckoutConfigVault(
    merchantId,
    merchantToken,
    customThemeConfig,
    widgets_general_config,
    elementsConfig
  );
};

export const configureClickToPayWithElements = async (
  merchantId: string,
  merchantToken: string,
  customThemeConfig?: ThemeConfig
): Promise<any> => {
  await createClickToPayWithElements(merchantId, merchantToken, customThemeConfig);
  await createNetwork(merchantId, merchantToken);
};

export async function configureSplitPaymentWithClickToPay(
  merchantId: string,
  merchantToken: string,
  config: { widgetGeneralConfig?: Partial<WidgetsGeneralConfig> } = {}
): Promise<any> {
  await createSplitPaymentWithClickToPay({ merchantId, merchantToken, config });
  await createNetwork(merchantId, merchantToken);
}

// TODO: refactor this function when the newman is deprecated
export async function createPaymentProcessor(
  bodyPaymentProcessor: ConnectionProcessorData,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const mtoken = merchantToken;
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  // Fraud processors reach this helper too (they identify by processor_name, not name), so
  // narrow before reading the payment-only field.
  const processorName = 'name' in bodyPaymentProcessor ? bodyPaymentProcessor.name : undefined;
  if (processorName === 'STRIPE_DIRECT' || processorName === ConnectionsAvailable.stripeDirect) {
    await paymentService.createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      mtoken
    );
  }
  // Only PayPal raises the webhook limit: for every other processor this is a single call.
  const processorId = await retryOnWebhookLimit(() =>
    paymentService.createPaymentProcessor(merchantId, mtoken, bodyPaymentProcessor)
  );

  return processorId;
}

export async function getOrderPaymentStatus(privateKey: string, orderToken: string): Promise<any> {
  const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
  const response = await emaService.getOrder(privateKey, orderToken);

  expect(response.status).toBe(200);
  const orderStatus = response.data.order.payment.data.status;
  const installments = response.data.order.payment.data.from_card.installment?.installments ?? '';
  const installmentsType =
    response.data.order.payment.data.from_card.installment?.installment_type ?? '';
  const airlineInformation = response.data.order.airline_information;
  const orderPayment = response.data.order.payment;
  return {
    orderStatus,
    installments,
    installmentsType,
    airlineInformation,
    orderPayment,
    bodyResponse: response.data,
  };
}

export async function createCampaignMSI(
  currency: CurrencyValues,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  await paymentMsiService.configCampaign(merchantId, merchantToken, currency, 'MSI');
}

export async function createCampaignMSIwithError(
  currency: CurrencyValues,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  await paymentMsiService.configCampaignWithError(merchantId, merchantToken, currency);
}
export async function createCampaignMCI(
  currency: CurrencyValues,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  await paymentMsiService.configCampaign(merchantId, merchantToken, currency, 'MCI');
}

export async function configSmartRouting(
  merchantId: string,
  merchantToken: string,
  numberProcessors?: string
): Promise<any> {
  const paymentSmartRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
  if (numberProcessors === '2') {
    await paymentSmartRoutingService.configSmartRouting(merchantId, merchantToken, '2');
  } else {
    await paymentSmartRoutingService.configSmartRouting(merchantId, merchantToken, '3');
  }
}

export async function configDynamicRouting(
  merchantId: string,
  merchantToken: string,
  ruleOption?: string
): Promise<any> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);

  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: {
      config_code: 'USE_DYNAMIC_ROUTING',
      config_value: 'ENABLED',
    },
  });

  if (ruleOption === 'bin') {
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Bin eq',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [{ rule_option: { id: 3, label: 'bin' }, operator: 'eq', operand: '424242' }],
      members: [{ payment_processor_id: 49, sort: 1, capabilities: null, strategy: 'cascade' }],
    });
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Branch eq',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [{ rule_option: { id: 3, label: 'branch' }, operator: 'eq', operand: 'visa' }],
      members: [{ payment_processor_id: 40, sort: 1, capabilities: null, strategy: 'cascade' }],
    });
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Branch neq',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [{ rule_option: { id: 3, label: 'branch' }, operator: 'neq', operand: 'visa' }],
      members: [{ payment_processor_id: 39, sort: 1, capabilities: null, strategy: 'cascade' }],
    });
  } else {
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Branch eq',
      priority: 2,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [{ rule_option: { id: 3, label: 'branch' }, operator: 'eq', operand: 'visa' }],
      members: [{ payment_processor_id: 40, sort: 1, capabilities: null, strategy: 'cascade' }],
    });
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Branch neq',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [{ rule_option: { id: 3, label: 'branch' }, operator: 'neq', operand: 'visa' }],
      members: [{ payment_processor_id: 49, sort: 1, capabilities: null, strategy: 'cascade' }],
    });
  }
}

export async function configDynamicRoutingWithFraud(
  fraudProcessorBody: Record<string, unknown>,
  routingRuleBody: Record<string, unknown>,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
  const guardService = ServiceFactory.getService(SERVICE_KEYS.GUARD);

  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: {
      config_code: 'USE_DYNAMIC_ROUTING',
      config_value: 'ENABLED',
    },
  });

  await guardService.createFraudProcessor(
    merchantToken,
    merchantId,
    crypto.randomUUID(),
    JSON.parse(JSON.stringify(fraudProcessorBody))
  );

  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, routingRuleBody);
}

export async function configDynamicRoutingWithRiskified(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  await configDynamicRoutingWithFraud(
    RISKIFIED_FRAUD_PROCESSOR_BODY,
    DYNAMIC_ROUTING_RISKIFIED_RULE_BODY,
    merchantId,
    merchantToken
  );
}

export async function configDynamicRoutingWithRiskifiedManualReview(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  await configDynamicRoutingWithFraud(
    RISKIFIED_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
    DYNAMIC_ROUTING_RISKIFIED_RULE_BODY,
    merchantId,
    merchantToken
  );
}

export async function configDynamicRoutingWithSift(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  await configDynamicRoutingWithFraud(
    SIFT_FRAUD_PROCESSOR_BODY,
    DYNAMIC_ROUTING_SIFT_RULE_BODY,
    merchantId,
    merchantToken
  );
}

/**
 * Creates a Sift fraud processor (only the processor, no routing rule).
 * Used to simulate configuring a connection before updating it in update-profile tests.
 */
export async function configureSiftProcessorOnly(
  fraudProcessorBody: Record<string, unknown>,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const guardService = ServiceFactory.getService(SERVICE_KEYS.GUARD);
  await guardService.createFraudProcessor(
    merchantToken,
    merchantId,
    crypto.randomUUID(),
    JSON.parse(JSON.stringify(fraudProcessorBody))
  );
}

export async function configDynamicRoutingWithSiftManualReview(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  await configDynamicRoutingWithFraud(
    SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
    DYNAMIC_ROUTING_SIFT_RULE_BODY,
    merchantId,
    merchantToken
  );
}

export async function configDynamicRoutingWithSignifyd(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  await configDynamicRoutingWithFraud(
    SIGNIFYD_FRAUD_PROCESSOR_BODY,
    DYNAMIC_ROUTING_SIGNIFYD_RULE_BODY,
    merchantId,
    merchantToken
  );
}

/**
 * Refund using v1 endpoint (`/merchants/orders/{token}/refund`).
 * Reserved for PSPs with synchronous refund flow that do not support the v2 async contract (e.g. Getnet, Elavon).
 * Validate with the backend team before adding new usages.
 *
 * @param validationRefund - object of type BaseValidationRefund with the expected status code and error details.
 * @param amount - partial refund amount. If omitted, the full order amount is refunded.
 * @deprecated Do not use for new test cases — use refundOrderV2 instead.
 */
export async function refundOrder(
  validationRefund: BaseValidationRefund,
  privateKey: string,
  amount: number = 0,
  orderToken: string
): Promise<any> {
  await executeRequestOperation('refund', orderToken, privateKey, amount, validationRefund);
}

/**
 * send collection Postman to void an order or partial void
 *
 * @param validationVoid - object of type Base Validation Void with the data to validate the result of the void
 * @param amount - amount to make partial void. If no amount is sent, the void will be made for the total of the order.
 */
export async function voidOrder(
  validationVoid: BaseValidationVoid,
  privateKey: string,
  amount: number = 0,
  orderToken: string
): Promise<any> {
  await executeRequestOperation('void', orderToken, privateKey, amount, validationVoid);
}

function buildRequestBody(amount: number): object {
  return {
    reason: 'void reason',
    ...(amount > 0 && { amount: amount }),
  };
}

async function executeRequestOperation(
  operationType: 'refund' | 'void',
  orderToken: string,
  privateKey: string,
  amount: number,
  validation: BaseValidation
): Promise<void> {
  let url = `${urlApi}/merchants/orders/${orderToken}/${operationType}`;
  const requestBody = buildRequestBody(amount);

  const response = await makeRequest('POST', url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': privateKey,
    },
    data: requestBody,
  });

  console.log(`-----> ${operationType} response: ${JSON.stringify(response)}`);
  await validateRespose(response, validation, operationType);
}

async function validateRespose(
  response: any,
  validation: BaseValidation,
  operationType: 'capture' | 'refund' | 'void'
): Promise<void> {
  expect(
    response.status,
    `The response code in ${operationType} is incorrect:\n${JSON.stringify(response, null, 2)}`
  ).toBe(validation.statusCode);

  if (response.status !== 200) {
    expect(response.body.error.code).toBe(validation.errorCode);
    expect(response.body.error.description).toBe(validation.errorDescription);
  }
}

export async function configDynamicRoutingWith3ds(
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
    label: 'default rule',
    priority: 1,
    status: 'enabled',
    is_default: true,
    trigger: 'payment',
    ignore_next_rules: false,
    conditions: [],
    members: [
      { payment_processor_id: 50, sort: 1, capabilities: ['3ds'], strategy: 'cascade' },
      { payment_processor_id: 40, sort: 2, capabilities: null, strategy: 'cascade' },
    ],
  });
  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: {
      config_code: 'USE_DYNAMIC_ROUTING',
      config_value: 'ENABLED',
    },
  });
}

export async function configDynamicRoutingWithDEUNA3ds(
  firstPaymentProcessorID: number,
  secondPaymentProcessorID: number,
  firstMerchantPaymentProcessorID: string,
  secondMerchantPaymentProcessorID: string,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: {
      config_code: 'USE_DYNAMIC_ROUTING',
      config_value: 'ENABLED',
    },
  });
  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
    label: 'default rule',
    priority: 1,
    status: 'enabled',
    is_default: true,
    trigger: 'payment',
    ignore_next_rules: false,
    conditions: [],
    members: [
      {
        payment_processor_id: firstPaymentProcessorID,
        payment_processor_name: 'First processor',
        merchant_payment_processor_id: firstMerchantPaymentProcessorID,
        sort: 1,
        capabilities: ['cvv', '3ds'],
        enabled: false,
        strategy: 'cascade',
        post_authorization: false,
      },
      {
        payment_processor_id: secondPaymentProcessorID,
        payment_processor_name: 'Second processor',
        merchant_payment_processor_id: secondMerchantPaymentProcessorID,
        sort: 2,
        capabilities: ['cvv'],
        enabled: false,
        strategy: 'cascade',
        post_authorization: false,
      },
    ],
  });
}

export async function createTwoDefaultRules(
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
  const defaultRule = {
    label: 'label3',
    priority: 1,
    status: 'enabled',
    is_default: true,
    trigger: 'merchant_rule',
    ignore_next_rules: false,
    conditions: [],
    members: [{ payment_processor_id: 40, sort: 1, strategy: 'cascade' }],
  };
  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, defaultRule);
  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, defaultRule);
  const rulesResponse = await paymentRoutingService.getMerchantRules(merchantId, merchantToken);
  return (rulesResponse.data as any).rules;
}

// TODO: fix this function to use axios and delete runNewman function and if condition
export async function setCreditCardForUser(
  userEmail: string,
  creditCardData: BaseCreditCard | Partial<BaseCreditCard>,
  addressCreditCard: BaseUserAddressCreditCard,
  merchantId: string,
  privateKey: string,
  otp?: string,
  registeredUser?: { user_id: string; token: string }
): Promise<any> {
  const bodyCreditCard = {
    address1: addressCreditCard.address1,
    card_cvv: creditCardData.cvv_code,
    card_holder: creditCardData.cardholder_name,
    card_holder_dni: creditCardData.document_number,
    card_number: creditCardData.number,
    city: addressCreditCard.city,
    country: addressCreditCard.country,
    expiry_month: creditCardData.expiration_date.substring(0, 2),
    expiry_year: `20${creditCardData.expiration_date.substring(2, 4)}`,
    phone: addressCreditCard.phone,
    state: addressCreditCard.state,
    zip: addressCreditCard.zip,
  };

  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);

  if (registeredUser) {
    await userAuthService.setCard({
      userId: registeredUser.user_id,
      userToken: registeredUser.token,
      data: bodyCreditCard,
    });
    return;
  }

  await userAuthService.setCardToUser(userEmail, bodyCreditCard, merchantId, privateKey, otp);
}

export async function setCreditCardForUserInNetwork(
  userEmail: string,
  creditCardData: BaseCreditCard,
  addressCreditCard: BaseUserAddressCreditCard,
  dataUser: BaseUserData,
  privateKey: string
): Promise<any> {
  const bodyCreditCard = {
    address1: addressCreditCard.address1,
    card_cvv: creditCardData.cvv_code,
    card_holder: creditCardData.cardholder_name,
    card_holder_dni: creditCardData.document_number,
    card_number: creditCardData.number,
    city: addressCreditCard.city,
    country: addressCreditCard.country,
    expiry_month: creditCardData.expiration_date.substring(0, 2),
    expiry_year: `20${creditCardData.expiration_date.substring(2, 4)}`,
    phone: addressCreditCard.phone,
    state: addressCreditCard.state,
    zip: addressCreditCard.zip,
  };

  const bodyGenerateUser = {
    must_save: true,
    email: userEmail,
    first_name: dataUser.name,
    last_name: dataUser.last_name,
    phone: dataUser.phone,
  };
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const generateUserResponse = await userAuthService.generateUser(privateKey, bodyGenerateUser);
  const { user_token, user_id } = generateUserResponse.data;
  await userAuthService.setCard({ userId: user_id, userToken: user_token, data: bodyCreditCard });
}

export async function trimDynamicRoutingRules(
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);

  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, TRIM_RULE_IN_BODY);
  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: USE_DYNAMIC_ROUTING_ENABLED,
  });
  const triggerResponse = await paymentRoutingService.evaluateTrigger(merchantId, {
    ...TRIM_EVALUATE_TRIGGER_BODY,
    transaction_id: crypto.randomUUID(),
  });
  return (triggerResponse.data as any)?.triggers ?? triggerResponse.data;
}

export async function createRuleWithOperatorContains(
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);

  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: USE_DYNAMIC_ROUTING_ENABLED,
  });
  await paymentRoutingService.createMerchantRule(merchantId, merchantToken, CONTAINS_RULE_BODY);
  const triggerResponse = await paymentRoutingService.evaluateTrigger(
    merchantId,
    { ...CONTAINS_EVALUATE_TRIGGER_BODY, transaction_id: crypto.randomUUID() },
    merchantToken
  );
  return (triggerResponse.data as any)?.triggers ?? triggerResponse.data;
}

// TODO: fix this function to use axios and delete runNewman function and if condition
export async function createEditableCampaign(
  merchantId: string,
  merchantToken: string,
  objectToEdit: string,
  respStatusCode: number,
  respCode?: number,
  respStatusMsg?: string
): Promise<any> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  const installmentsCampaignData: InstallmentsCampaignData = JSON.parse(objectToEdit);
  const response = await paymentMsiService.createInstallmentCampaign(
    {
      merchantToken: merchantToken!,
      merchantId: merchantId,
      installmentsCampaignData: installmentsCampaignData,
    },
    true // expectError = true for validation tests
  );
  return response;
}

const VOLARIS_EXTERNAL_ENDPOINT: ExternalEndpointData = {
  url: 'https://navitaire-middleware.stg.deuna.io/api/v1/installments?amount={amount}&bin={bin}&bank_name={bank_name}&currency={currency}&merchant_id={merchant_id}',
  http_method: 'GET',
  config_type: 'MCI',
};

export async function enableInstallmentsFromVolaris(
  merchantId: string,
  privateKey: string,
  merchantToken: string
): Promise<void> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentService.configurationMerchantPayments({
    merchantToken,
    merchantId,
    storeId: 'all',
    configurationMerchantPaymentsData: {
      config_code: 'ALLOW_MCI',
      config_value: 'ENABLED',
    },
  });

  await createNavitaireMerchant(merchantId, privateKey, merchantToken, {
    installments_url:
      'https://psp-mock.dev.deuna.io/api/volaris/deferredpaymentsetting?bins=491284&rates=1.2&installments=3,6,9,12,18',
  });

  const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
  await merchantAuthService.addExternalEndpoint(
    merchantId,
    merchantToken,
    VOLARIS_EXTERNAL_ENDPOINT
  );
}

export async function deleteCampaign(
  merchantId: string,
  merchantToken: string,
  campaignId?: string
): Promise<void> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  await paymentMsiService.deleteCampaign(merchantId, merchantToken, campaignId, true);
}

export async function getCampaignByCampaignID(
  merchantId: string,
  merchantToken: string,
  campaignId?: string
): Promise<void> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  await paymentMsiService.getCampaignById(merchantId, merchantToken, campaignId, true);
}

// TODO: fix this function to use axios and delete runNewman function and if condition
export async function updateCampaign(
  bodyToUpdate: string,
  respStatusCode: number,
  respCode: number,
  respStatusMsg: string,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  const paymentMsiService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
  const installmentCampaingResponse = await paymentMsiService.createInstallmentCampaign({
    merchantId: merchantId,
    merchantToken: merchantToken,
    installmentsCampaignData: DEFAULT_CAMPAIGN_MSI,
  });

  const campaignId = installmentCampaingResponse.data.data.id;
  const expectError = updateResponse.updateInvalidStatus.statusCode === 400 ? true : false;
  const updateCampaignResponse = await paymentMsiService.updateInstallmentCampaign(
    merchantId,
    merchantToken,
    campaignId,
    JSON.parse(bodyToUpdate),
    expectError
  );
  paymentMsiService.validateUpdateInstallmentCampaignResponse(
    respStatusCode,
    respCode,
    respStatusMsg,
    updateCampaignResponse
  );
}

export async function getUserDeviceInformation(
  sessionID: string,
  validationUserDevice: BaseValidationUserDevice,
  privateKey: string,
  merchantId: string
): Promise<any> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const expectError = validationUserDevice.statusCode !== 200;
  const response = await userAuthService.identifyUserDevice(
    sessionID,
    privateKey,
    merchantId,
    expectError
  );

  expect(response.status).toBe(validationUserDevice.statusCode);
  if (validationUserDevice.statusCode !== 200) {
    expect((response.data as any).code).toBe(validationUserDevice.errorCode);
    expect((response.data as any).message).toBe(validationUserDevice.errorDescription);
  }
}

export async function addCardToUserID(
  userID: string,
  userToken: string,
  creditCardData: BaseCreditCard,
  addressCreditCard: BaseUserAddressCreditCard,
  userEmail: string,
  dataUser: BaseUserData
): Promise<any> {
  const bodyCreditCard = {
    address1: addressCreditCard.address1,
    card_cvv: creditCardData.cvv_code,
    card_holder: creditCardData.cardholder_name,
    card_holder_dni: creditCardData.document_number,
    card_number: creditCardData.number,
    city: addressCreditCard.city,
    country: addressCreditCard.country,
    expiry_month: creditCardData.expiration_date.substring(0, 2),
    expiry_year: `20${creditCardData.expiration_date.substring(2, 4)}`,
    phone: addressCreditCard.phone,
    state: addressCreditCard.state,
    zip: addressCreditCard.zip,
  };

  const bodyGenerateUser = {
    must_save: true,
    email: userEmail,
    first_name: dataUser.name,
    last_name: dataUser.last_name,
    phone: dataUser.phone,
  };

  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const response = await userAuthService.setCard({
    userId: userID,
    userToken,
    data: bodyCreditCard,
  });
  return {
    status: response.status,
    data: response.data?.data,
  };
}

export async function makePurchaseV1WithCardID(
  privateKey: string,
  merchantId: string,
  orderToken: string,
  cardID: string,
  userEmail: string,
  userToken: string,
  methodType: string,
  processorName: string
): Promise<any> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const response = await paymentService.purchaseV2(
    privateKey,
    userToken,
    {
      order_token: orderToken,
      payer_info: {
        email: userEmail,
      },
      payment_source: {
        method_type: methodType as any,
        processor: processorName,
        card_info: {
          card_id: cardID,
        },
      },
    } as any,
    true
  );
  return response.data;
}

export async function createMerchantStoreWithData(
  mpcConfig: object,
  merchantId: string,
  merchantToken: string
): Promise<void> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentService.createConfigMerchantPayments(
    {
      config_code: 'MPC_CONFIGURATION',
      config_value: JSON.stringify(mpcConfig),
    },
    merchantId,
    merchantToken
  );
}

export async function execGetTransactionVisibility(
  orderId: string,
  merchantId: string,
  merchantToken: string
): Promise<any> {
  try {
    const transactionTraceService = ServiceFactory.getService(SERVICE_KEYS.TRANSACTION_TRACE);
    const response = await transactionTraceService.getTransactionVisibilityLogs(
      orderId,
      'transaction_visibility',
      merchantId,
      merchantToken
    );
    return response.data;
  } catch (error) {
    console.error('Error in execGetTransactionVisibility:', error);
    throw error;
  }
}

export async function expectPaymentStatusInTimeline(
  orderId: string,
  status: OrderStatusTypes,
  merchantId: string,
  merchantToken: string,
  timeoutMs: number = 45000
): Promise<void> {
  const transactionTraceService = ServiceFactory.getService(SERVICE_KEYS.TRANSACTION_TRACE);
  await expect
    .poll(
      async () => {
        const response = await transactionTraceService.getTransactionVisibilityLogs(
          orderId,
          'timeline',
          merchantId,
          merchantToken
        );
        return response.data
          .filter((entry) => entry.message === 'tl_payment_status_updated')
          .map((entry) => entry.metadata.payload?.payment_status);
      },
      { timeout: timeoutMs, intervals: [3000] }
    )
    .toContain(status);
}

export interface TransactionSettlement {
  invoice_id: string;
  order_token: string;
  order_id: string;
  transaction_id: string;
  conciliation_id: string;
  amount: number;
  transaction_status: string;
  settlement_status: string;
  card_token: string;
  raw_request: string;
  raw_response: string;
  raw_airline_data: string;
  raw_billing_address: string;
  raw_secure_authentication: string;
  raw_data: string;
}

async function withMetabaseRetry(
  queryFn: () => Promise<{ body: any; status: number; statusText: string }>,
  maxRetries: number = 5,
  delayMs: number = 3000
): Promise<{ body: any; status: number; statusText: string }> {
  let result = await queryFn();
  for (let attempt = 1; attempt <= maxRetries && result.status >= 500; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await queryFn();
  }
  return result;
}

export async function getTransactionsSettlement(
  order_token: string
): Promise<TransactionSettlement[]> {
  const { body, status, statusText } = await withMetabaseRetry(() =>
    getTransactionsSettlementQuery(order_token)
  );
  if (status !== 202 || statusText !== 'Accepted') {
    throw new Error(
      `Error getting transactions settlement: ${status} - ${statusText} - ${JSON.stringify(body)}`
    );
  }

  const rows = body.data.rows;
  const settlements: TransactionSettlement[] = [];
  for (let index = 0; index < rows.length; index++) {
    const element = rows[index];
    settlements.push({
      invoice_id: element[0],
      order_token: element[1],
      order_id: element[2],
      transaction_id: element[3],
      conciliation_id: element[4],
      amount: element[5],
      transaction_status: element[6],
      settlement_status: element[7],
      raw_request: element[8],
      raw_response: element[9],
      raw_airline_data: element[10],
      raw_billing_address: element[11],
      raw_secure_authentication: element[12],
      raw_data: element[13],
      card_token: element[14],
    });
  }

  return settlements;
}

export interface Invoice {
  id: string;
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  external_transaction_id: string;
  authorization_code: string;
  raw_response: string;
  card_token: string;
  card_expiration: string;
  card_id: string;
  order_token: string;
  capture_cutoff_at: string;
  refund_cutoff_at: string;
  verify_at: string;
}

export async function getInvoicePayment(orderToken: string, orderId: string): Promise<Invoice> {
  const { body, status, statusText } = await withMetabaseRetry(() =>
    getInvoiceQuery(orderToken, orderId)
  );
  if (status !== 202 || statusText !== 'Accepted') {
    throw new Error(`Error getting invoice: ${status} - ${statusText} - ${JSON.stringify(body)}`);
  }

  const rows = body.data.rows;
  const invoices: Invoice[] = [];
  for (let index = 0; index < rows.length; index++) {
    const element = rows[index];
    invoices.push({
      id: element[0],
      transaction_id: element[1],
      status: element[2],
      amount: element[3],
      currency: element[4],
      external_transaction_id: element[5],
      authorization_code: element[6],
      raw_response: element[7],
      card_token: element[8],
      card_expiration: element[9],
      card_id: element[10],
      order_token: element[11],
      capture_cutoff_at: element[12],
      refund_cutoff_at: element[13],
      verify_at: element[14],
    });
  }

  if (invoices.length === 0) {
    throw new Error(`Invoice not found for order token: ${orderToken}`);
  }

  return invoices[0];
}

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  external_transaction_id: string;
  authorization_code: string;
  raw_request: object;
  raw_response: object;
  conciliation_id: string;
  industry_specific_data: object;
  is_final_operation: boolean;
  allTransactions?: Transaction[];
}

export async function getTransactions(invoice_id: string): Promise<Transaction[]> {
  const { body, status, statusText } = await withMetabaseRetry(() =>
    getTransactionsQuery(invoice_id)
  );
  if (status !== 202 || statusText !== 'Accepted') {
    throw new Error(
      `Error getting transactions: ${status} - ${statusText} - ${JSON.stringify(body)}`
    );
  }

  const rows = body.data.rows;
  const transactions: Transaction[] = [];
  for (let index = 0; index < rows.length; index++) {
    const element = rows[index];
    transactions.push({
      id: element[0],
      type: element[1],
      status: element[2],
      amount: element[3],
      external_transaction_id: element[4],
      authorization_code: element[5],
      raw_request: element[6] == null ? {} : JSON.parse(element[6]),
      raw_response: element[7] == null ? {} : JSON.parse(element[7]),
      conciliation_id: element[8],
      industry_specific_data: element[9] == null ? {} : JSON.parse(element[9]),
      is_final_operation: element[10],
    });
  }

  return transactions;
}

export interface ResultCreateCard {
  id: string;
  expiration_date: string;
}

export async function createCard(
  userID: string,
  userToken: string,
  creditCardData: BaseCreditCard | Partial<BaseCreditCard>
): Promise<ResultCreateCard> {
  const bodyCreditCard: Record<string, any> = {
    card_holder: creditCardData.cardholder_name,
    card_holder_dni: creditCardData.document_number,
    card_number: creditCardData.number,
    expiry_month: creditCardData.expiration_date.substring(0, 2),
    expiry_year: `20${creditCardData.expiration_date.substring(2, 4)}`,
  };

  if ('cvv_code' in creditCardData) {
    bodyCreditCard.card_cvv = creditCardData.cvv_code;
  }

  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const response = await userAuthService.setCard({
    userId: userID,
    userToken,
    data: bodyCreditCard as any,
  });
  const bodyResp = response.data?.data;
  if (response.status !== 201) {
    throw new Error(
      `Error getting transactions: ${response.status} - - ${JSON.stringify(bodyResp)}`
    );
  }

  expect(bodyResp).toHaveProperty('id');
  const resultResultCreateCard: ResultCreateCard = {
    id: bodyResp.id,
    expiration_date: bodyResp.expiration_date,
  };

  return resultResultCreateCard;
}

export interface ResultRegisterUser {
  user_id: string;
  token: string;
}

export async function registerUser(
  email: string,
  dataUser: BaseUserData,
  validationUser: BaseValidationUser,
  privateKey: string,
  merchantId: string
): Promise<ResultRegisterUser> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const expectError = validationUser.statusCode !== 201;

  const response = await userAuthService.registerUser(
    {
      merchantPrivateKey: privateKey,
      merchantId: merchantId,
      data: {
        email,
        first_name: dataUser.name,
        last_name: dataUser.last_name,
        phone: dataUser.phone,
        identity_document: dataUser.dni,
      },
    },
    expectError
  );

  expect(response.status).toBe(validationUser.statusCode);

  if (expectError) {
    if (validationUser.errorCode) {
      expect(response.data).toHaveProperty('code', validationUser.errorCode);
    }
    if (validationUser.errorDescription) {
      expect(response.data).toHaveProperty('message', validationUser.errorDescription);
    }
    return { user_id: '', token: '' };
  }

  return {
    user_id: response.data.user_id,
    token: response.data.token,
  };
}

export async function createMerchantUserV3WithNetwork(
  merchantRole: string,
  merchantStoreCode: string,
  merchantIds: string[],
  networkId: string,
  merchantToken: string
): Promise<string> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const body = buildMerchantUserWithNetworkBody(
    merchantRole,
    merchantStoreCode,
    merchantIds,
    networkId
  );
  return userAuthService.createMerchantUserWithNetwork(merchantToken, body);
}

export async function createMerchantUserV3WithoutNetwork(
  merchantRole: string,
  merchantStoreCode: string,
  merchantId: string,
  merchantToken: string
): Promise<string> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const body = buildMerchantUserWithoutNetworkBody(merchantRole, merchantStoreCode, merchantId);
  return userAuthService.createMerchantUserWithoutNetwork(merchantToken, body);
}

export async function createMerchantUserV3Role(
  roleName: string,
  merchantIds: string[],
  networkId: string,
  environments: string[],
  merchantToken: string
): Promise<MerchantUserV3RoleResponse> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const body = buildMerchantRoleBody(roleName, merchantIds, networkId, environments);
  return userAuthService.createMerchantRole(merchantToken, merchantIds[0], body);
}

export interface ResultRefundV2 {
  refund_id: string;
  status: string;
  refunds: Array<{
    refund_id: string;
    refund_amount: {
      amount: number;
      currency: string;
    };
    refunded_on: string;
    status: string;
    external_transaction_id: string;
    refund_reason: string;
  }>;
}

/**
 * send collection Postman to refund an order or partial refund V2
 *
 * @param validationRefund - object of type Base Validation Refund with the data to validate the result of the refund
 * @param amount - amount to make partial refund. If no amount is sent, the refund will be made for the total of the order.
 * @param isFinal - boolean to indicate if the refund is final
 * @param credentials - object with the credentials to be used in the refund
 */
export async function refundOrderV2(
  validationRefund: BaseValidationRefund,
  privateKey: string,
  amount: number = 0,
  isFinal: boolean = false,
  credentials: Credentials
): Promise<ResultRefundV2> {
  const orderToken = credentials.orderToken;
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const isErrorExpected = validationRefund.statusCode >= 400;
  const response = await paymentService.refundV2(privateKey, orderToken, {
    ...(amount > 0 && { amount }),
    is_final: isFinal,
    expectError: isErrorExpected,
  });

  if (isErrorExpected) {
    const errorBody = (response.data as any)?.error;
    expect(response.status).toBe(validationRefund.statusCode);
    if (validationRefund.errorCode) {
      expect(errorBody?.code).toBe(validationRefund.errorCode);
    }
    if (validationRefund.errorDescription) {
      expect(errorBody?.description).toBe(validationRefund.errorDescription);
    }
    return { refund_id: '', status: '', refunds: [] };
  }

  const data = (response.data as any)?.data as any;

  if (!data) {
    return { refund_id: '', status: '', refunds: [] };
  }

  return {
    refund_id: data.refund_id,
    status: data.status,
    refunds: (data.refunds || []).map((refund: any) => ({
      refund_id: refund.refund_id,
      refund_amount: {
        amount: refund.refund_amount.amount,
        currency: refund.refund_amount.currency,
      },
      refunded_on: refund.refunded_on,
      status: refund.status,
      external_transaction_id: refund.external_transaction_id,
      refund_reason: refund.refund_reason,
    })),
  };
}

export interface ResultCaptureV2 {
  capture_id: string;
  status: string;
  captures: Array<{
    capture_id: string;
    captured_amount: {
      amount: number;
      currency: string;
    };
    status: string;
    external_transaction_id: string;
    captured_on: string;
  }>;
}

export interface Credentials {
  orderToken: string;
}

export async function captureV2(
  validationCapture: BaseValidationCapture,
  privateKey: string,
  amount: number = 0,
  isFinal: boolean | undefined = undefined,
  credentials: Credentials
): Promise<ResultCaptureV2> {
  const orderToken = credentials.orderToken;
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

  const isErrorExpected = !!validationCapture.errorCode;
  const response = await paymentService.captureV2(privateKey, orderToken, {
    reason: 'Captura Test',
    ...(amount > 0 ? { amount } : {}),
    ...(isFinal !== undefined ? { final_capture: isFinal } : {}),
    expectError: isErrorExpected,
  });

  const body = response.data as any;

  if (isErrorExpected) {
    expect(body.error?.code).toBe(validationCapture.errorCode);
    if (validationCapture.errorDescription) {
      expect(body.error?.description).toContain(validationCapture.errorDescription);
    }
    return undefined as any;
  }

  const data = (body?.data?.data ?? body?.data ?? body) as any;

  const capturesRaw = (data?.captures ?? []) as CaptureResponseV2['captures'];
  const captures = (capturesRaw ?? []).map((itemCapture) => ({
    capture_id: itemCapture.capture_id,
    captured_amount: {
      amount: itemCapture.captured_amount.amount,
      currency: itemCapture.captured_amount.currency,
    },
    status: itemCapture.status,
    external_transaction_id: itemCapture.external_transaction_id,
    captured_on: itemCapture.captured_on,
  }));

  captures.sort((a, b) => new Date(a.captured_on).getTime() - new Date(b.captured_on).getTime());

  return {
    capture_id: data.capture_id,
    status: data.status,
    captures,
  };
}

export async function getOrdersWithFilters(
  queryName: string,
  queryValue: string,
  privateKey: string
): Promise<{ order_token: string }> {
  const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
  return emaService.getOrdersWithFilters(queryName, queryValue, privateKey);
}

export interface ResultCreateBatch {
  batch_id: string;
  status: string;
  processor_id: string;
  processor_name: string;
  filter_merchant_payment_processor: string;
  batch_external_reference_id: string;
  file_base: FileBase;
}

export interface FileBase {
  folder: string;
  date: string;
  name: string;
}

export async function SettlementCreateBath(
  paymentProcessorID: number,
  filterMerchantPaymentProcessor: boolean,
  merchantId: string,
  privateKey: string
): Promise<ResultCreateBatch> {
  const settlementService = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
  const response = await settlementService.createBatch(privateKey, {
    processor_id: paymentProcessorID,
    merchant_id: merchantId,
    filter_merchant_payment_processor: filterMerchantPaymentProcessor,
  });

  const bodyResp = response.data;

  return {
    batch_id: bodyResp.batch_id,
    batch_external_reference_id: bodyResp.batch_external_reference_id,
    status: bodyResp.status,
    processor_id: bodyResp.processor_id,
    processor_name: bodyResp.processor_name,
    filter_merchant_payment_processor: bodyResp.filter_merchant_payment_processor,
    file_base: {
      folder: bodyResp.file_base.folder,
      date: bodyResp.file_base.date,
      name: bodyResp.file_base.name,
    },
  };
}
export interface ResultStatusFileBatch {
  success: boolean;
  size: number;
  num_transactions: number;
}

export async function SettlementFileBase(
  fileKey: string,
  privateKey: string
): Promise<ResultStatusFileBatch> {
  const settlementService = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
  const response = await settlementService.statusBatchFile(privateKey, { file_key: fileKey });
  const bodyResp = response.data;

  return {
    success: bodyResp.success,
    size: bodyResp.size,
    num_transactions: bodyResp.num_transactions,
  };
}

export interface ResultGetBatch {
  id: string;
  batch_id: string;
  status: string;
  processor_id: string;
  filter_merchant_payment_processor: string;
  batch_external_reference_id: string;
}

export async function GetBatch(batchID: string): Promise<ResultGetBatch> {
  const settlementService = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
  const response = await settlementService.getBatch(batchID);
  const bodyResp = response.data;

  return {
    id: bodyResp.id,
    batch_id: bodyResp.batch_id,
    batch_external_reference_id: bodyResp.batch_external_reference_id,
    status: bodyResp.status,
    processor_id: bodyResp.processor_id,
    filter_merchant_payment_processor: bodyResp.filter_merchant_payment_processor,
  };
}

export async function UploadFile(processor_name: string, file64: string): Promise<void> {
  const settlementService = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
  await settlementService.uploadFile(processor_name, { file_content_base64: file64 });
}

export interface webhookProcessorRequest {
  merchant_id: string;
  invoice_id: string;
  order_id: string;
  processor_name: string;
  skip_mpc?: boolean;
  captured_cutoff_at?: string;
  transactions?: [
    {
      transaction_id: string;
      status: string;
    },
  ];
}

export interface RequestWebhookGeneric {
  invoice_fields?: {
    invoice_id: string;
    captured_cutoff_at?: string;
    refunded_cutoff_at?: string;
  };
  transaction_fields?: {
    transaction_id: string;
    status: string;
  };
}
export async function webhookProcessor(
  request: webhookProcessorRequest | RequestWebhookGeneric
): Promise<void> {
  const processorName =
    (request as webhookProcessorRequest) && 'processor_name' in request
      ? request.processor_name
      : 'GENERIC_DEUNA';

  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentService.sendWebhookByProcessorName(
    processorName,
    request as Record<string, unknown>
  );
}

export async function paymentCron(): Promise<void> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentService.runPaymentCron();
}

export async function createSubscription(
  { planId, currency, privateKey }: NewmanCreateSubscriptionParams,
  merchantId: string,
  merchantToken: string
): Promise<CreateSubscriptionResponse> {
  const userId = crypto.randomUUID();
  const userEmail = `${userId}@testuser.com`;
  const userToken = await loginGuest(merchantId, userId, privateKey);
  const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  const orderData = DeunanowOrderBuilder.createOrder('MX', { user_email: userEmail });
  orderData.order.initiator_type = 'customer';
  orderData.order.recurrence = {
    first_time_use: true,
    scheduled: true,
    recurrence_id: crypto.randomUUID(),
  };
  const [orderResponse, cardResponse] = await Promise.all([
    emaService.tokenizeOrder({ privateKey, orderData }),
    retryApiCall(
      () =>
        userAuthService.setCard({
          userId,
          userToken,
          data: DEFAULT_CARD_DATA,
        }),
      ({ status }) => status === 201,
      3,
      3000
    ),
  ]);
  const orderToken = orderResponse.data.token;
  const cardId = cardResponse.data.data.id;
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  await paymentService.purchaseV2(privateKey, userToken, {
    order_token: orderToken,
    payer_info: { email: userEmail },
    payment_source: {
      method_type: MethodType.CREDIT_CARD,
      processor: 'kushkiProcessor',
      card_info: { card_id: cardId },
    },
  });
  await retryApiCall(
    () => emaService.getOrder(privateKey, orderToken),
    ({ data }) => data.order.status === 'succeeded',
    10,
    3000
  );
  const subscriptionService = ServiceFactory.getService(SERVICE_KEYS.SUBSCRIPTION);
  const response = await subscriptionService.createSubscription(
    merchantId,
    merchantToken,
    planId,
    currency,
    orderToken,
    cardId
  );
  return response.data as CreateSubscriptionResponse;
}

export interface ThreeDsFlowDetailsAuthIDs {
  initiate_three_ds_id: string;
  continue_three_ds_id: string;
  complete_three_ds_id: string;
}

export async function getThreeDsFlowAuthIDs(order_id: string): Promise<ThreeDsFlowDetailsAuthIDs> {
  const { body, status, statusText } = await getThreeDsFlowAuthIDsQuery(order_id);
  if (status !== 202 || statusText !== 'Accepted') {
    throw new Error(
      `Error getting 3DS flow details: ${status} - ${statusText} - ${JSON.stringify(body)}`
    );
  }

  const cols = body.data.rows[0];

  const res: ThreeDsFlowDetailsAuthIDs = {
    initiate_three_ds_id: cols[0],
    continue_three_ds_id: cols[1],
    complete_three_ds_id: cols[2],
  };

  return res;
}

type Callback<T = any> = (result: T, statusCode: number) => void;
export async function CreateOrder(
  privateKey: string,
  request: TokenizeOrderRequestData,
  validate?: Callback<TokenizeOrderResponse>
): Promise<TokenizeOrderResponse> {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.EMA);
  const apiResponse = await userAuthService.tokenizeOrderWithCustomBody(privateKey, request, true);
  if (validate) {
    validate(apiResponse.data, apiResponse.status);
  }
  return apiResponse.data;
}

export async function PurchaseV2(
  userToken: string,
  privateKey: string,
  purchaseRequestV2: PurchaseRequestV2,
  validate?: Callback<PurchaseResponse>
): Promise<any> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const apiResponse = await paymentService.purchaseV2(
    privateKey,
    userToken,
    purchaseRequestV2,
    true
  );
  if (validate) {
    validate(apiResponse.data, apiResponse.status);
  }
  return apiResponse.data;
}

/**
 * Sends a refund or partial refund webhook if the environment is preprod.
 *
 * @param processorState - 'refunded' or 'partial_refunded'
 * @param transactionId - The transaction identifier (ticketNumber)
 * @param externalTransactionId - The external transaction identifier (saleTicketNumber)
 * @param processorId - The payment processor identifier
 * @param processorName - The name of the processor (defaults to 'kushki')
 */
export async function sendWebhookRefundIfPreprod(
  processorState: 'refunded' | 'partial_refunded',
  transactionId: string,
  externalTransactionId: string,
  processorId?: string,
  processorName: string = 'kushki'
): Promise<void> {
  if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
    console.log(
      `[INFO] Sending webhook for ${processorState}. Transaction ID: ${transactionId}, Processor ID: ${processorId}`
    );

    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
    await paymentService.sendWebhookByProcessorName(processorName, {
      processorState,
      ticketNumber: transactionId,
      saleTicketNumber: externalTransactionId,
      token: '',
      transactionType: 'refund',
      transactionStatus: 'approval',
    });
  }
}

/**
 * Asserts that a Kushki refund went through its in-progress status before the webhook settles it.
 * - Preprod never receives Kushki's refund webhook, so the order stays in that status until
 *   `sendWebhookRefundIfPreprod` and can be read from the order. Preprod has no transaction-trace
 *   service either.
 * - In staging the webhook lands within 2-4 s, so polling the order misses it. There it is read
 *   from the timeline, which records partial refunds as `refunding` too.
 * Call it after the refund request and before sending the preprod webhook.
 */
export async function expectRefundInProgress(
  emaService: EmaService,
  privateKey: string,
  orderToken: string,
  orderStatus: 'refunding' | 'partial_refunding',
  timeline: { orderId: string; merchantId: string; merchantToken: string }
): Promise<void> {
  if (envConfig.NODE_ENV === allowedEnvironments.PRE_PRODUCTION) {
    await retryGetOrderStatus(emaService, privateKey, orderToken, orderStatus);
    return;
  }
  await expectPaymentStatusInTimeline(
    timeline.orderId,
    'refunding',
    timeline.merchantId,
    timeline.merchantToken
  );
}

// ---------------------------------------------------------------------------
// Trace log assertions with retry
// ---------------------------------------------------------------------------

export interface TraceLogAssertion {
  /** Expected value of log.message. Omit to match any message. */
  message?: string;
  /** Expected subset of log.metadata?.payload. Omit to skip this check. */
  payload?: Record<string, unknown>;
  /** Whether the predicate should match at least one log entry. Defaults to true. */
  expected?: boolean;
}

interface TraceLogsServiceLike {
  getTraceLogsV2(
    transactionIds: string[],
    merchantId: string,
    merchantToken: string
  ): Promise<{ data: TraceLogV2[] }>;
}

/** Reads the transaction and payment IDs from EMA after purchase. */
export async function getTraceTransactionIds(
  emaService: EmaService,
  privateKey: string,
  orderToken: string
): Promise<[string, string, string]> {
  const response = await emaService.getOrder(privateKey, orderToken);
  const transactionId = response.data.order.transaction_id;
  const paymentId = response.data.order.payment?.data?.id;
  if (!orderToken || !transactionId || !paymentId) {
    throw new Error(
      'Trace Logs V2 requires order token, order.transaction_id, and order.payment.data.id'
    );
  }
  return [orderToken, transactionId, paymentId];
}

/**
 * Fetches Trace Logs V2 for all order identifiers and validates a set of assertions.
 * Automatically retries when assertions fail, allowing asynchronous log propagation.
 *
 * @param service          - Service instance exposing getTraceLogsV2.
 * @param transactionIds   - Order token, transaction ID, and payment ID to query.
 * @param assertions       - Array of conditions to verify against the log entries.
 * @param merchantToken    - Merchant token used to authenticate the trace query.
 * @param maxRetries       - Maximum number of attempts (default: 5).
 * @param retryDelay       - Milliseconds to wait between retries (default: 3000).
 */
export async function assertTraceLogs(
  service: TraceLogsServiceLike,
  transactionIds: [string, string, string],
  assertions: TraceLogAssertion[],
  merchantId: string,
  merchantToken: string,
  maxRetries: number = 5,
  retryDelay: number = 3000
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const logResponse = await service.getTraceLogsV2(transactionIds, merchantId, merchantToken);
      const logs = logResponse.data;

      for (const { message, payload, expected = true } of assertions) {
        const found = logs.some((l) => {
          const messageMatch = message === undefined || l.message === message;
          const payloadMatch =
            payload === undefined ||
            Object.entries(payload).every(([key, value]) => l.metadata?.payload?.[key] === value);
          return messageMatch && payloadMatch;
        });
        expect(
          found,
          `Trace log ${message ?? 'matching payload'} for IDs ${transactionIds.join(',')}`
        ).toBe(expected);
      }

      console.log(
        `[INFO] assertTraceLogs --> All assertions passed on attempt ${attempt}/${maxRetries}.`
      );
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.log(
          `[INFO] assertTraceLogs --> Attempt ${attempt}/${maxRetries} failed. Retrying in ${retryDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.log(`[INFO] assertTraceLogs --> Max retries (${maxRetries}) reached.`);
      }
    }
  }

  throw lastError ?? new Error(`assertTraceLogs failed after ${maxRetries} attempts.`);
}

export function assertCaptureV2Error(
  response: { status: number; data?: any },
  expected: BaseValidationCapture
): void {
  expect(response.status).toBe(expected.statusCode);
  expect(response.data?.error?.code).toBe(expected.errorCode);
  expect(response.data?.error?.description).toContain(expected.errorDescription);
}

/**
 * Validates Cybersource HTTP status code from Metabase query.
 * Executes query and asserts: status is 202, response contains valid data.
 *
 * @param orderId - The transaction ID to query
 */
export async function validateCybersourceStatusCode(orderId: string): Promise<void> {
  const { body, status, statusText } = await getCybersourceStatusCodeFromMetabaseQuery(orderId);
  expect(status).toBe(202);
  expect(statusText).toBe('Accepted');
  expect(body.row_count).toBe(1);
  expect(body.data.rows.length).toBeGreaterThan(0);
  expect(body.data.rows[0].length).toBeGreaterThanOrEqual(2);
  expect(body.data.rows[0][0]).toBe(orderId);
  expect(body.data.rows[0][1]).toBe('201');
}

/**
 * Validates that Sift API keys in database match those sent to Sift.
 * Executes query and asserts: status is 202, first 4 and last 4 chars match.
 *
 * @param orderId - The transaction ID to query
 * @param apiKey - The API key to compare against database
 */
export async function validateSiftApiKeys(orderId: string, apiKey: string): Promise<void> {
  const { body, status, statusText } = await getApiKeysFromMetabaseQueryForComparison(orderId);
  expect(status).toBe(202);
  expect(statusText).toBe('Accepted');
  expect(body.row_count).toBe(1);
  expect(body.data.rows.length).toBeGreaterThan(0);
  expect(body.data.rows[0].length).toBeGreaterThanOrEqual(3);
  const keyToSift = body.data.rows[0][2];
  expect(apiKey.substring(0, 4)).toBe(keyToSift.substring(0, 4));
  expect(apiKey.slice(-4)).toBe(keyToSift.slice(-4));
}

/**
 * Validates that external transaction ID is stored in uppercase in database.
 * Executes query and asserts: status is 202, ID matches uppercase of input.
 *
 * @param orderId - The transaction ID to query
 */
export async function validateExternalTransactionIdUpperCase(orderId: string): Promise<void> {
  const { body, status, statusText } =
    await getExternalTransactionIdUpperCaseFromMetabaseQuery(orderId);
  expect(status).toBe(202);
  expect(statusText).toBe('Accepted');
  expect(body.row_count).toBe(1);
  expect(body.data.rows.length).toBeGreaterThan(0);
  expect(body.data.rows[0].length).toBeGreaterThanOrEqual(2);
  expect(body.data.rows[0][0]).toBe(orderId);
  expect(body.data.rows[0][1]).toBe(orderId.toUpperCase());
}

// Legacy aliases for backward compatibility (deprecated)
export const assertCybersourceStatusCode = validateCybersourceStatusCode;
export const assertSiftApiKeys = validateSiftApiKeys;
export const assertExternalTransactionIdUpperCase = validateExternalTransactionIdUpperCase;
