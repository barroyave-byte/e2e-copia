/**
 * Service key types for type-safe service registration and retrieval
 */

// Define available service keys as const assertions for strict typing
export const SERVICE_KEYS = {
  USER_AUTH: 'userAuth',
  PAYMENT: 'payment',
  MERCHANT_AUTH: 'merchantAuth',
  EMA: 'ema',
  CHECKOUT_CONFIGURATION: 'checkoutConfiguration',
  PAYMENT_MSI: 'paymentMsi',
  TRANSACTION_TRACE: 'transactionTrace',
  PAYMENT_ROUTING: 'paymentRouting',
  PERMIT_IO: 'permitIo',
  GUARD: 'guard',
  FRAUD_SETTINGS: 'fraudSettings',
  STATSIG: 'statsig',
  ASAAS: 'asaas',
  SUBSCRIPTION: 'subscription',
  SETTLEMENT: 'settlement',
  NAVITAIRE: 'navitaire',
  SABRE: 'sabre',
  TELCEL: 'telcel',
  VTEX_MIDDLEWARE: 'vtexMiddleware',
  WALLET_CREDENTIALS: 'walletCredentials',
  FINTOC: 'fintoc',
} as const;

// Create union type from the service keys
export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS];

// Type mapping for service key to service class
export interface ServiceTypeMap {
  [SERVICE_KEYS.USER_AUTH]: import('../services/UserAuthService').UserAuthService;
  [SERVICE_KEYS.PAYMENT]: import('../services/PaymentService').PaymentService;
  [SERVICE_KEYS.MERCHANT_AUTH]: import('../services/MerchantAuthService').MerchantAuthService;
  [SERVICE_KEYS.EMA]: import('../services/EmaService').EmaService;
  [SERVICE_KEYS.CHECKOUT_CONFIGURATION]: import('../services/CheckoutConfigurationService').CheckoutConfigurationService;
  [SERVICE_KEYS.PAYMENT_MSI]: import('../services/PaymentMsiService').PaymentMsiService;
  [SERVICE_KEYS.TRANSACTION_TRACE]: import('../services/TransactionTraceService').TransactionTraceService;
  [SERVICE_KEYS.PAYMENT_ROUTING]: import('../services/PaymentRoutingService').PaymentRoutingService;
  [SERVICE_KEYS.PERMIT_IO]: import('../services/PermitService').PermitService;
  [SERVICE_KEYS.GUARD]: import('../services/GuardService').GuardService;
  [SERVICE_KEYS.FRAUD_SETTINGS]: import('../services/FraudSettingsService').FraudSettingsService;
  [SERVICE_KEYS.STATSIG]: import('../services/StatsigService').StatsigService;
  [SERVICE_KEYS.ASAAS]: import('../services/AsaasService').AsaasService;
  [SERVICE_KEYS.SUBSCRIPTION]: import('../services/SubscriptionService').SubscriptionService;
  [SERVICE_KEYS.SETTLEMENT]: import('../services/SettlementService').SettlementService;
  [SERVICE_KEYS.NAVITAIRE]: import('../services/NavitaireService').NavitaireService;
  [SERVICE_KEYS.SABRE]: import('../services/SabreService').SabreService;
  [SERVICE_KEYS.TELCEL]: import('../services/TelcelService').TelcelService;
  [SERVICE_KEYS.VTEX_MIDDLEWARE]: import('../services/VtexMiddlewareService').VtexMiddlewareService;
  [SERVICE_KEYS.WALLET_CREDENTIALS]: import('../services/WalletCredentialsService').WalletCredentialsService;
  [SERVICE_KEYS.FINTOC]: import('../services/FintocService').FintocService;
}

// Helper type to get service type from key
export type ServiceFromKey<K extends ServiceKey> = K extends keyof ServiceTypeMap
  ? ServiceTypeMap[K]
  : never;

// Utility to check if a key is valid
export function isValidServiceKey(key: string): key is ServiceKey {
  return Object.values(SERVICE_KEYS).includes(key as ServiceKey);
}
