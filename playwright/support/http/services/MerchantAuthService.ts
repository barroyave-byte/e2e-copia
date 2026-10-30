import { ApiResponse } from '../BaseHttpClient';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { BaseService } from './BaseService';
import { ServiceFactory } from '../ServiceFactory';
import {
  MerchantRequest,
  MerchantResponse,
  MerchantLoginRequest,
  MerchantLoginResponse,
  StoreRequest,
  StoreResponse,
  MerchantApplicationRequest,
  MerchantApplicationResponse,
  ExternalEndpointData,
  ExternalEndpointResponse,
} from '../models/merchantAuth';
import { EndpointConfig } from '../config/EndpointConfig';
import { MerchantConfigByCountry } from '../testData/merchant_auth/MerchantConfigByCountry';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { CheckoutConfigurationService } from './CheckoutConfigurationService';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';
import { MerchantRegistry } from '@support/utils/MerchantRegistry';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { ExpiringTokenCache } from '../utils/ExpiringTokenCache';
import { readAdminApiToken, saveAdminApiToken } from '../utils/AdminApiTokenFile';
import { claimFreshMerchant } from '@support/merchantPool/fresh';
import { SAFE_RETRY_STATUSES_FOR_CREATE } from '../utils/retryPolicy';

/** Wraps an ApiError in an Error that keeps its HTTP status, instead of "[object Object]". */
function toServiceError(context: string, error: any): Error & { status?: number } {
  const detail =
    error?.status !== undefined
      ? `HTTP ${error.status} ${error.code ?? ''} ${error.description ?? ''}`.trim()
      : String(error?.message ?? error);
  return Object.assign(new Error(`${context}: ${detail}`), { status: error?.status });
}

/**
 * Options for creating a complete merchant setup
 */
export interface BasicMerchantOptions {
  country: CountryCodes;
  customName?: string;
  managedByDuna?: boolean;
  storeConfig?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  createApplications?: boolean;
}

/**
 * Complete merchant setup result
 */
export interface BasicMerchantResult {
  merchantId: string;
  merchantName: string;
  merchantToken: string;
  privateKey: string;
  publicKey: string;
}

@RegisterService(SERVICE_KEYS.MERCHANT_AUTH)
export class MerchantAuthService extends BaseService {
  private checkoutConfigurationService: CheckoutConfigurationService;
  private readonly adminTokenCache = new ExpiringTokenCache();
  /** A setup-project token the API rejected with a 401: never picked up again by this worker. */
  private rejectedSetupToken?: string;

  constructor(httpClient: any) {
    super(httpClient);
    // Initialize dependent service
    this.checkoutConfigurationService = ServiceFactory.getService(
      SERVICE_KEYS.CHECKOUT_CONFIGURATION
    );
  }

  async createMerchant(createMerchantData: MerchantRequest): Promise<MerchantResponse> {
    try {
      const response = await this.httpClient.request<MerchantResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'create'),
        method: 'POST',
        data: createMerchantData,
        // A 504 leaves it unknown whether the merchant was created; resending would add a
        // duplicate and more load on a service that is already timing out.
        retryOn: SAFE_RETRY_STATUSES_FOR_CREATE,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Merchant creation failed: ${JSON.stringify(error)}`);
    }
  }

  async merchantLogin(
    merchantLoginData: MerchantLoginRequest = {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    }
  ): Promise<MerchantLoginResponse> {
    try {
      const response = await this.httpClient.request<MerchantLoginResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'login'),
        data: merchantLoginData,
        method: 'POST',
        // A login creates nothing, so resending it after a dropped connection is safe. It is
        // one of the calls that failed without a response in regression run 36587703729.
        retryOnNoResponse: true,
        // A healthy login answers in ~100ms; 60s per attempt would let three retries eat the
        // whole 4-minute test timeout.
        timeout: 15000,
        logging: {
          logRequest: true,
          logResponse: true,
          logHeaders: false,
          logData: false,
        },
      });

      return response.data;
    } catch (error) {
      throw toServiceError('Merchant login failed', error);
    }
  }

  async createStore(storeData: StoreRequest): Promise<StoreResponse> {
    try {
      const response = await this.httpClient.request<StoreResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'store'),
        data: storeData.storeData,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: storeData.merchantToken,
        },
        pathParams: {
          merchantId: storeData.merchantId,
        },
        logging: {
          logRequest: true,
          logResponse: true,
          logHeaders: false,
          logData: false,
        },
      });

      return response.data;
    } catch (error) {
      throw toServiceError('Store creation failed', error);
    }
  }

  async createMerchantApplications(
    merchantApplicationData: MerchantApplicationRequest
  ): Promise<MerchantApplicationResponse> {
    try {
      const response = await this.httpClient.request<MerchantApplicationResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'applications'),
        data: merchantApplicationData.merchantApplicationData,
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantApplicationData.merchantToken,
        },
        pathParams: {
          merchantId: merchantApplicationData.merchantId,
        },
        logging: {
          logRequest: false,
          logResponse: false,
          logHeaders: false,
          logData: false,
        },
      });

      return response.data;
    } catch (error) {
      throw toServiceError('Merchant applications creation failed', error);
    }
  }

  /**
   * Creates a complete merchant setup with merchant, store, and applications
   *
   * @param options - Configuration options for merchant creation
   * @returns Complete merchant setup result
   */
  async createBasicMerchant(options: BasicMerchantOptions): Promise<BasicMerchantResult> {
    const claimed = await this.claimPreProvisioned(options);
    if (claimed) return claimed;

    const startedAt = Date.now();
    const timings: Record<string, number> = {};
    const timed = async <T>(step: string, run: () => Promise<T>): Promise<T> => {
      const stepStartedAt = Date.now();
      try {
        return await run();
      } finally {
        timings[step] = Date.now() - stepStartedAt;
      }
    };
    let merchantId = '';
    let failedStep = 'create';
    try {
      console.log(`Creating basic merchant setup for country: ${options.country}`);

      // Step 1: Create merchant using country-specific configuration
      const merchantData = MerchantConfigByCountry.createMerchantRequest(
        options.country,
        options.customName,
        options.managedByDuna ?? false
      );

      const merchant = await timed('create', () => this.createMerchant(merchantData));
      merchantId = merchant.id;
      console.log('Merchant created successfully');
      this.registerForPreprodCleanup(merchantId);

      // The admin token is its own step: fetched inside "store", a failed login was reported
      // as a store failure (4 of the 6 "store" failures of regression run 36587703729).
      failedStep = 'token';
      await timed('token', () => this.getAdminToken());

      // Step 2: Create store. Processors are registered against it, so a missing store only
      // surfaces later as an unrelated failure: stop here instead of carrying on.
      failedStep = 'store';
      await timed('store', () =>
        this.withAdminToken((token) =>
          this.createStore({
            merchantToken: token,
            merchantId,
            storeData: {
              name: 'all',
              latitude: 19.3600265,
              longitude: -99.1574174,
              address: 'Alberca Olímpica Francisco Márquez',
            },
          })
        )
      );
      console.log('Store created successfully');

      // Step 3: Create applications. Without them privateKey/publicKey are empty and the test
      // fails much later with a misleading 401 "invalid X-API-KEY" (PAYM-T1928).
      failedStep = 'applications';
      const applications = await timed('applications', () =>
        this.withAdminToken((token) =>
          this.createMerchantApplications({
            merchantToken: token,
            merchantId,
            merchantApplicationData: {
              expire_at: 'DEV',
              is_sandbox: true,
              name: 'Excepte',
            },
          })
        )
      );
      if (!applications?.private_key || !applications?.public_key) {
        throw new Error('the applications response has no private_key/public_key');
      }
      console.log('Applications created successfully');

      // Cached by the "token" step (or refreshed by withAdminToken after a 401).
      const merchantToken = await this.getAdminToken();

      this.logProvisioning({ outcome: 'created', merchantId, options, startedAt, timings });
      return {
        merchantId,
        merchantName: merchant.name,
        merchantToken,
        privateKey: applications.private_key,
        publicKey: applications.public_key,
      };
    } catch (error) {
      this.logProvisioning({
        outcome: 'failed',
        merchantId,
        options,
        startedAt,
        timings,
        failedStep,
      });
      console.error(`Basic merchant setup failed at step "${failedStep}":`, error);
      throw new Error(
        `Failed to create basic merchant setup at step "${failedStep}"` +
          `${merchantId ? ` (merchant ${merchantId})` : ''}: ${
            error instanceof Error ? error.message : JSON.stringify(error)
          }`
      );
    }
  }

  /**
   * In CI with a pre-provisioned manifest, a standard merchant (only a country) is claimed from
   * the shard's single-use stock instead of created now; any other option creates one as before.
   * See playwright/support/merchantPool/fresh.ts.
   */
  private async claimPreProvisioned(
    options: BasicMerchantOptions
  ): Promise<BasicMerchantResult | undefined> {
    const standard = Object.entries(options).every(
      ([key, value]) => key === 'country' || value === undefined
    );
    if (!standard) return undefined;
    const merchant = claimFreshMerchant(options.country);
    if (!merchant) return undefined;
    console.log(
      `[merchant-provisioning] ${JSON.stringify({
        outcome: 'claimed',
        env: envConfig.NODE_ENV,
        merchantId: merchant.merchantId,
        country: options.country,
        pid: process.pid,
      })}`
    );
    return { ...merchant, merchantToken: await this.getAdminToken() };
  }

  /**
   * The admin token is not scoped to a merchant (merchant_id is null in its claims) and lives
   * 72h, so one login per worker serves every merchant it creates. Logging in once per merchant
   * used to add ~1750 identical logins to every regression run.
   */
  private getAdminToken(): Promise<string> {
    return this.adminTokenCache.get(async () => {
      // The setup project logged in once for the whole shard (auth.setup.ts).
      const fromSetup = readAdminApiToken(this.httpClient.baseUrl);
      if (fromSetup && fromSetup !== this.rejectedSetupToken) return fromSetup;
      return this.loginAsAdmin();
    });
  }

  private async loginAsAdmin(): Promise<string> {
    console.log('Getting merchant token');
    const response = await this.merchantLogin({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });
    return response.token;
  }

  /**
   * Called by the setup project: logs in once and leaves the token for every worker of the shard,
   * which then skip their own login (one login per shard instead of one per worker process).
   */
  async publishAdminTokenForWorkers(): Promise<void> {
    saveAdminApiToken(await this.loginAsAdmin(), this.httpClient.baseUrl);
  }

  /** The worker's cached admin token, for callers that reuse an existing merchant (merchant pool). */
  getAdminAccessToken(): Promise<string> {
    return this.getAdminToken();
  }

  /** Runs a call with the cached admin token, logging in again once if the session was revoked. */
  private async withAdminToken<T>(run: (token: string) => Promise<T>): Promise<T> {
    const token = await this.getAdminToken();
    try {
      return await run(token);
    } catch (error: any) {
      if (error?.status !== 401) throw error;
      console.warn('[MerchantAuthService] Cached admin token rejected with 401; logging in again');
      this.rejectedSetupToken = token;
      this.adminTokenCache.invalidate();
      return run(await this.getAdminToken());
    }
  }

  private registerForPreprodCleanup(merchantId: string): void {
    if (envConfig.NODE_ENV !== allowedEnvironments.PRE_PRODUCTION) return;
    try {
      MerchantRegistry.getInstance().register(merchantId);
    } catch (registryError) {
      // Cleanup bookkeeping must not fail merchant creation.
      console.warn('[MerchantAuthService] Failed to register merchant for cleanup:', registryError);
    }
  }

  /**
   * One structured line per merchant, prefixed so a run's stdout can be grepped to count how
   * many merchants it created and which step is slow or failing (see docs/merchant-pool-plan.md).
   */
  private logProvisioning(entry: {
    outcome: 'created' | 'failed';
    merchantId: string;
    options: BasicMerchantOptions;
    startedAt: number;
    timings: Record<string, number>;
    failedStep?: string;
  }): void {
    console.log(
      `[merchant-provisioning] ${JSON.stringify({
        outcome: entry.outcome,
        env: envConfig.NODE_ENV,
        merchantId: entry.merchantId || null,
        country: entry.options.country,
        failedStep: entry.failedStep,
        totalMs: Date.now() - entry.startedAt,
        stepsMs: entry.timings,
        pid: process.pid,
      })}`
    );
  }

  /**
   * Creates a complete merchant setup with merchant, store, and applications
   *
   * @param options - Configuration options for merchant creation
   * @returns Complete merchant setup result
   */
  async createBasicMerchantCheckout(options: BasicMerchantOptions): Promise<BasicMerchantResult> {
    const result = await this.createBasicMerchant(options);
    // Create checkout
    await this.checkoutConfigurationService.createCheckout({
      merchantPrivateKey: result.privateKey,
      merchantId: result.merchantId,
      createCheckoutData: {
        version: '1.0.0',
        active: true,
        plugin: 'shopify',
        traffic_percentage: 100,
        google_optimize: {
          google_optimize_id: '',
          google_experiment_id: '',
        },
        utm_campaign: [],
      },
    });

    return result;
  }

  async getCurrentUserProfile(
    merchantToken: string
  ): Promise<{ id: string; merchants: string[] | null; mfa_enabled: boolean }> {
    try {
      const response = await this.httpClient.request<{
        id: string;
        merchants: string[] | null;
        mfa_enabled: boolean;
      }>({
        url: EndpointConfig.getEndpoint('merchant', 'currentUserProfile'),
        method: 'GET',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get current user profile: ${error}`);
    }
  }

  async resetUserMfa(userId: string, merchantToken: string, merchantId: string): Promise<void> {
    try {
      await this.httpClient.request<void>({
        url: EndpointConfig.getEndpoint('merchant', 'resetUserMfa'),
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        headers: {
          'X-Merchant-Id': merchantId,
        },
        pathParams: {
          userId,
        },
      });
    } catch (error) {
      throw new Error(`MFA reset failed for user ${userId}: ${error}`);
    }
  }

  async updateMerchantMfaPolicy(
    merchantId: string,
    merchantToken: string,
    mfaMode: 'disabled' | 'optional' | 'required'
  ): Promise<ApiResponse<void>> {
    try {
      return this.httpClient.request<void>({
        url: EndpointConfig.getEndpoint('merchant', 'updateMfaPolicy'),
        method: 'PUT',
        data: {
          mfa_mode: mfaMode,
        },
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        headers: {
          'X-Merchant-Id': merchantId,
          'Content-Type': 'application/json',
        },
        pathParams: {
          merchantId,
        },
      });
    } catch (error) {
      throw new Error(
        `MFA policy update failed for merchant ${merchantId} (mode: ${mfaMode}): ${error}`
      );
    }
  }

  async addExternalEndpoint(
    merchantId: string,
    merchantToken: string,
    data: ExternalEndpointData
  ): Promise<ApiResponse<ExternalEndpointResponse>> {
    try {
      const response = await this.httpClient.request<ExternalEndpointResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'externalEndpoints'),
        method: 'POST',
        data,
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        pathParams: {
          merchantId,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`addExternalEndpoint failed: ${JSON.stringify(error)}`);
    }
  }

  async getExternalEndpoint(
    privateKey: string,
    type: string
  ): Promise<ApiResponse<ExternalEndpointResponse>> {
    try {
      const response = await this.httpClient.request<ExternalEndpointResponse>({
        url: EndpointConfig.getEndpoint('merchant', 'getExternalEndpoints'),
        method: 'GET',
        auth: { type: 'api-key', apiKey: privateKey },
        params: { type },
      });
      return response;
    } catch (error) {
      throw new Error(`getExternalEndpoint failed: ${JSON.stringify(error)}`);
    }
  }

  async generetePublicKeys(merchantId: string, merchantToken: string): Promise<{ data: string }> {
    try {
      const response = await this.httpClient.request<{ data: string }>({
        url: EndpointConfig.getEndpoint('merchant', 'publicKeys'),
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        pathParams: {
          merchantId: merchantId,
        },
        logging: {
          logRequest: false,
          logResponse: false,
          logHeaders: false,
          logData: false,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate public keys:', error);
      throw new Error(`Failed to generate public keys: ${error}`);
    }
  }
}
