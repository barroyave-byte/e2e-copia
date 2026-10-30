// Endpoint configuration for different services
export class EndpointConfig {
  private static readonly endpoints = {
    auth: {
      guestLogin: '/users/login',
    },
    payment: {
      purchase: '/merchants/transactions/purchase',
      purchaseFraude: '/transactions/purchase',
      purchaseV2: '/v2/merchants/orders/purchase',
      captureV2: '/v2/merchants/orders/{orderToken}/capture',
      refundV2: '/v2/merchants/orders/{orderToken}/refund',
      configMerchantPayments: '/payments/merchants/{merchantId}/stores/{storeId}/configurations',
      deleteConfigMerchantPayments:
        '/payments/merchants/{merchantId}/stores/{storeId}/configurations/{configId}',
      createConfigMerchantPayments: '/payments/merchants/{merchantId}/configurations',
      createVerifierCredentials: '/payments/verifier-credentials',
      deleteVerifierCredentials: '/payments/verifier-credentials/{verifierCredentialsId}',
      enableVerifierCredentials: '/payments/verifier-credentials/{verifierCredentialsId}/enable',
      processors: '/merchants/{merchantId}/stores/{storeCode}/processors',
      deletePaymentProcessor: '/merchants/{merchantId}/stores/{storeCode}/processors/{processorId}',
      recipients: '/merchants/{merchantId}/recipients',
      sendPaymentWebhook: '/transactions/webhooks/payconnect/{merchant_payment_processor_id}',
      xmlWebhookByProcessorId: '/transactions/webhooks/payconnect/{processorId}',
      xmlWebhookByProcessorName:
        '/transactions/webhooks/payconnect/payment-processors/{processorName}',
      sendSpeiOpmWebhook: '/transactions/webhooks/opm-spei',
      runCron: '/internal/transactions/cron',
      binDetector: '/cards/bin/{bin}',
      worldpayWebhook: '/transactions/webhooks/processors/{processorName}',
      refundAsync: '/merchants/orders/{order_token}/refund-async',
      voidAsync: '/merchants/orders/{order_token}/void-async',
      captureAsync: '/merchants/orders/{order_token}/capture-async',
    },
    merchant: {
      create: '/merchants',
      login: '/merchants/login',
      store: '/merchants/{merchantId}/stores',
      applications: '/merchants/{merchantId}/applications',
      publicKeys: '/merchants/{merchantId}/public-keys',
      currentUserProfile: '/v2/merchants-tokens/me',
      resetUserMfa: '/v2/merchants/users/{userId}/mfa/reset',
      updateMfaPolicy: '/v2/merchants/{merchantId}/security/mfa',
      externalEndpoints: '/merchants/{merchantId}/external-endpoints',
      getExternalEndpoints: '/merchants/resources/external-endpoints',
    },
    subscription: {
      create: '/subscriptions',
      createPlan: '/subscriptions/plans',
      getPlans: '/subscriptions/plans',
    },
    ema: {
      tokenizeOrder: '/merchants/orders',
      getOrders: '/merchants/orders',
      updateOrder: '/merchants/orders/{order_token}',
      getOrder: '/merchants/orders/{order_token}',
      expireOrder: '/merchants/orders/{order_token}/expire',
      cancelOrder: '/merchants/orders/{order_token}/cancel',
      executeDynamicWebhook: '/merchants/external-orders/{orderToken}/webhooks/{eventName}',
    },
    userAuth: {
      guestLogin: '/users/login?type=guest',
      registerUser: '/users/register',
      getUser: '/users/me',
      deleteUser: '/users/{userId}',
      createNetwork: '/users/networks',
      deleteNetwork: '/users/networks/{networkId}',
      getNetwork: '/users/networks/{networkId}',
      merchantToNetwork: '/users/networks/{networkId}/merchants/{merchantId}',
      setAddress: '/users/{userId}/addresses',
      setCard: '/users/{userId}/cards',
      getCards: '/users/{userId}/cards',
      getCard: '/users/{userId}/cards/{cardId}',
      deleteCard: '/users/{userId}/cards/{cardId}',
      generateUser: '/users/generate',
      loginUserTypeSms: '/users/login?type=sms-passwordless',
      loginDeviceFingerprint: '/users/login/device-fingerprint',
      logout: '/users/logout',
      signMessage: '/users/sign-message',
      externalAuthorize: '/users/external-authorize?load_profile_data=true',
      requestOtpCode: '/users/request-code',
      createMerchantUser: '/v2/merchants/users',
      createMerchantRole: '/merchants/admin/roles',
      identifyDevice: '/users/sessions/{session_id}/device',
    },
    checkoutConfiguration: {
      createCheckout: '/merchants/{merchantId}/checkout',
      createConfigCheckoutV2: '/checkout-config/merchants/{merchantId}/configurations',
      createWebhook: '/checkout-config/merchants/{merchantId}/webhooks',
      updateWebhook: '/checkout-config/merchants/{merchantId}/webhooks/{eventName}',
      createCustomField: '/checkout-config/merchants/{merchantId}/custom-fields',
      getAllThemes: '/merchants/checkout/themes',
      manageTheme: '/merchants/checkout/themes/{themeId}',
    },
    paymentMsi: {
      createInstallmentCampaign: '/merchants/{merchantId}/installments/campaigns',
      updateInstallmentCampaign: '/merchants/{merchantId}/installments/campaigns/{campaignId}',
      getCampaigns: '/merchants/{merchantId}/installments/campaigns',
      getCampaignById: '/merchants/{merchantId}/installments/campaigns/{campaignId}',
      deleteCampaign: '/merchants/{merchantId}/installments/campaigns/{campaignId}',
      getInstallments: '/transactions/payments-methods/credit_card/installments',
      getOrderInstallments: '/merchants/transactions/orders/{order_token}/installments',
    },
    transactionTrace: {
      traceLogs: '/trace/logs?transactionID={order_id}&sub_type={sub_type}',
      traceLogsV2: '/v2/trace/logs',
    },
    paymentRouting: {
      merchantRouting: '/routing/merchants/{merchantId}',
      processorRouting: '/routing/merchants/{merchantId}/processors',
      storeRouting: '/merchants/{merchantId}/stores-config',
      activeRouting: '/merchants/{merchantId}/stores-config/set-active',
      createMerchantRule: '/routing/merchants/{merchantId}/rules',
      updateMerchantRule: '/routing/merchants/{merchantId}/rules/{ruleId}',
      deleteMerchantRule: '/routing/merchants/{merchantId}/rules/{ruleId}',
      getMerchantRule: '/routing/merchants/{merchantId}/rules/{ruleId}',
      getMerchantRules: '/routing/merchants/{merchantId}/rules',
      consultationTrigger: '/routing/merchants/{merchantId}/consultations/triggers',
      evaluateTrigger: '/routing/merchants/{merchantId}/triggers',
    },
    permitIo: {
      deleteMerchant: '/resource_instances/{merchantId}',
      bulkDeleteMerchants: '/bulk/resource_instances',
    },
    guard: {
      createFraudProcessor: '/merchant/profile',
      getFraudProcessor: '/merchant/{merchantId}/profile',
    },
    fraudSettings: {
      getFraudSettings: '/merchants/{merchantId}/fraud-settings',
      updateFraudSettings: '/merchants/{merchantId}/fraud-settings',
      deleteFraudSettings: '/merchants/{merchantId}/fraud-settings',
    },
    statsig: {
      createGateRule: '/console/v1/gates/{featureFlagId}/rule',
      deleteGateRule: '/console/v1/gates/{featureFlagId}/rules/{ruleId}',
      updateGateRule: '/console/v1/gates/{featureFlagId}/rules/{ruleId}',
      getGateRules: '/console/v1/gates/{featureFlagId}/rules',
    },
    settlement: {
      createBatch: '/settlements/batches',
      statusBatchFile: '/settlements/internal/status-file-batch-base',
      getBatch: '/settlements/batch',
      uploadFile: '/settlements/internal/files/{processorName}',
      uploadInternalFile: '/settlements/internal/files/{fileType}',
    },
    navitaire: {
      soap: '/navitaire-middleware/soap/UniversalReciever_1_0.asmx',
      createMerchant: '/navitaire-middleware/merchants',
      merchantById: '/navitaire-middleware/merchants/{merchantId}',
    },
    sabre: {
      soap: '/sabre/soap/PaymentReceiver.asmx',
      createMerchant: '/sabre-middleware/merchants',
      merchantById: '/sabre-middleware/merchants/{merchantId}',
    },
    telcel: {
      inquiry: '/telcel-middleware/transactions/inquiry',
      createOrder: '/merchants/orders',
    },
    asaas: {
      createWebhook: '/api/v3/webhooks',
      deleteWebhook: '/api/v3/webhooks/{webhookId}',
      simulatePixPayment: '/api/v3/pix/qrCodes/pay',
    },
    vtexMiddleware: {
      createPayment: '/api/v1/payments',
    },
    wallet: {
      credentials: '/wallet/credentials',
    },
    fintoc: {
      createWebhook: '/v1/webhook_endpoints',
      deleteWebhook: '/v1/webhook_endpoints/{webhookId}',
    },
  } as const;

  static getEndpoint(service: keyof typeof EndpointConfig.endpoints, operation: string): string {
    const serviceEndpoints = EndpointConfig.endpoints[service] as Record<string, string>;
    const endpoint = serviceEndpoints[operation];

    if (!endpoint) {
      throw new Error(`Endpoint not found for service: ${service}, operation: ${operation}`);
    }

    return endpoint;
  }

  static getAllEndpoints() {
    return EndpointConfig.endpoints;
  }
}
