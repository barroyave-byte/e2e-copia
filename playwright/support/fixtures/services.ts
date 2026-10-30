import { test as base } from './global-fixtures';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import type {
  MerchantAuthService,
  PaymentService,
  UserAuthService,
  EmaService,
  PaymentMsiService,
  PaymentRoutingService,
  TransactionTraceService,
  CheckoutConfigurationService,
  GuardService,
  StatsigService,
  AsaasService,
  SubscriptionService,
  SettlementService,
  NavitaireService,
  SabreService,
  TelcelService,
  VtexMiddlewareService,
  WalletCredentialsService,
  FraudSettingsService,
  FintocService,
} from '@support/http/services';
import envConfig from '@support/envConfig';

// Define the type for our fixtures
export interface ServiceFixtures {
  merchantAuthService: MerchantAuthService;
  paymentService: PaymentService;
  userAuthService: UserAuthService;
  emaService: EmaService;
  paymentMsiService: PaymentMsiService;
  paymentRoutingService: PaymentRoutingService;
  transactionTraceService: TransactionTraceService;
  checkoutConfigurationService: CheckoutConfigurationService;
  guardService: GuardService;
  statsigService: StatsigService;
  asaasService: AsaasService;
  subscriptionService: SubscriptionService;
  settlementService: SettlementService;
  navitaireService: NavitaireService;
  sabreService: SabreService;
  telcelService: TelcelService;
  vtexMiddlewareService: VtexMiddlewareService;
  walletCredentialsService: WalletCredentialsService;
  fraudSettingsService: FraudSettingsService;
  fintocService: FintocService;
}

// Extend the base test with our service fixtures
export const test = base.extend<ServiceFixtures>({
  merchantAuthService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    await use(service);
  },

  paymentService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
    await use(service);
  },

  userAuthService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
    await use(service);
  },

  emaService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.EMA);
    await use(service);
  },

  paymentMsiService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI);
    await use(service);
  },

  paymentRoutingService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
    await use(service);
  },

  transactionTraceService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.TRANSACTION_TRACE);
    await use(service);
  },

  checkoutConfigurationService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.CHECKOUT_CONFIGURATION);
    await use(service);
  },

  guardService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.GUARD);
    await use(service);
  },

  statsigService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.STATSIG, envConfig.STATSIG_URL);
    await use(service);
  },

  asaasService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.ASAAS, 'https://sandbox.asaas.com');
    await use(service);
  },

  subscriptionService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.SUBSCRIPTION);
    await use(service);
  },

  settlementService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.SETTLEMENT);
    await use(service);
  },

  navitaireService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.NAVITAIRE);
    await use(service);
  },

  sabreService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.SABRE);
    await use(service);
  },

  telcelService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.TELCEL);
    await use(service);
  },

  vtexMiddlewareService: async ({}, use) => {
    const service = ServiceFactory.getService(
      SERVICE_KEYS.VTEX_MIDDLEWARE,
      envConfig.URL_MIDDLEWARE
    );
    await use(service);
  },

  walletCredentialsService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.WALLET_CREDENTIALS);
    await use(service);
  },

  fraudSettingsService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.FRAUD_SETTINGS);
    await use(service);
  },

  fintocService: async ({}, use) => {
    const service = ServiceFactory.getService(SERVICE_KEYS.FINTOC, 'https://api.fintoc.com');
    await use(service);
  },
});

export { expect } from '@playwright/test';
