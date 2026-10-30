import { Context, FrameworkPlugin } from '../interface';
import { STATE_KEYS, publish, resolveMerchantId, resolveMerchantToken } from '../../resolve';
import { createNetwork } from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { FlagNames, PaymentType, RuleNames } from '@support/interfaces/statsig/statsig';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { ConfigurationMerchantPaymentsData } from '@support/http/models/payment';
import { getMerchantPool, type MerchantPoolKey } from '@support/merchantPool';

/** The payments configuration applies to every store unless the spec narrows it. */
const ALL_STORES = 'all';

export class PluginSetupMerchant extends FrameworkPlugin {
  pluginBaseName = 'setup.merchant';

  private configMerchant!: ConfigMerchant;
  private configMerchantCheckout!: ConfigMerchantCheckout;
  private configStatsig!: ConfigStatsig;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.configMerchant = new ConfigMerchant();
    this.configMerchantCheckout = new ConfigMerchantCheckout();
    this.configStatsig = new ConfigStatsig();
  }

  /** Makes the merchant reachable to later actions without going through process.env. */
  private storeMerchant(merchant: {
    merchantId: string;
    merchantName: string;
    merchantToken: string;
    privateKey: string;
    publicKey: string;
  }) {
    this.context.merchant = merchant;
    publish(this.context, STATE_KEYS.merchantId, merchant.merchantId);
    publish(this.context, STATE_KEYS.merchantName, merchant.merchantName);
    publish(this.context, STATE_KEYS.merchantToken, merchant.merchantToken);
    publish(this.context, STATE_KEYS.privateKey, merchant.privateKey);
    publish(this.context, STATE_KEYS.publicKey, merchant.publicKey);
    return merchant;
  }

  /** @description Creates and configures a basic merchant for the given country using ConfigMerchant.basicSetup. Stores the merchant in the test context so later actions resolve merchantId, privateKey and publicKey without any parameter. Returns the merchant — add saveAs to reference it from a later step. */
  async $tf_basicSetup({ country }: { country: CountryCodes }) {
    return this.storeMerchant(await this.configMerchant.basicSetup(country));
  }

  /** @description Gets a merchant from the shared merchant pool instead of creating one: the catalog entry (MERCHANT_POOL in @support/merchantPool) fixes its country and processors. Use it only when the test never changes merchant-level configuration; the integrity check fails the test if it changes the merchant's processors. Stores the merchant in the test context like setup.merchant.basicSetup. Returns the merchant — add saveAs to reference it from a later step. */
  async $tf_acquirePooled({ key }: { key: MerchantPoolKey }) {
    const merchant = await getMerchantPool().acquire(key, this.context.test.info().file);
    this.storeMerchant(merchant);
    return merchant;
  }

  /** @description Creates and configures a basic merchant with checkout support for the given country using ConfigMerchantCheckout.basicSetup. Stores the merchant in the test context so later actions resolve merchantId, privateKey and publicKey without any parameter. Returns the merchant — add saveAs to reference it from a later step. */
  async $tf_configureCheckout({ country }: { country: CountryCodes }) {
    return this.storeMerchant(await this.configMerchantCheckout.basicSetup(country));
  }

  /** @description Applies a merchant-level payments configuration (e.g. MERCADOPAGO_BINARY_MODE = DISABLED). Pass one of the named constants in @support/http/testData/payment/PaymentMerchantConfigurations. Defaults to every store, and to the merchant from a previous setup.merchant action. */
  async $tf_configurePayments({
    configuration,
    storeId = ALL_STORES,
    merchantId,
    merchantToken,
  }: {
    configuration: ConfigurationMerchantPaymentsData;
    storeId?: string;
    merchantId?: string;
    merchantToken?: string;
  }) {
    const action = 'setup.merchant.configurePayments';
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    return await paymentService.configurationMerchantPayments({
      merchantId: resolveMerchantId(this.context, action, merchantId),
      merchantToken: resolveMerchantToken(this.context, action, merchantToken),
      storeId,
      configurationMerchantPaymentsData: configuration,
    });
  }

  /** @description Creates a network and adds the merchant to it — required by the flows that operate on a merchant network rather than a standalone merchant. merchantId and merchantToken default to the merchant from a previous setup.merchant action. Returns { networkId, networkName } — add saveAs to reference it from a later step. */
  async $tf_createNetwork({
    merchantId,
    merchantToken,
  }: { merchantId?: string; merchantToken?: string } = {}) {
    const action = 'setup.merchant.createNetwork';
    return await createNetwork(
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken)
    );
  }

  /** @description Manages Statsig feature flag rules for a given flag ID. Use action="create" to add a rule, "delete" to remove it, or "get" to retrieve existing rules. */
  async $tf_configureStatsig({
    featureFlagID,
    ruleID,
    paymentType,
    action,
    merchantId,
  }: {
    featureFlagID: FlagNames;
    ruleID: RuleNames;
    paymentType?: PaymentType;
    action: 'create' | 'delete' | 'get';
    merchantId?: string;
  }) {
    if (action === 'create') {
      if (!paymentType) {
        throw new Error('configureStatsig: paymentType is required when action is "create"');
      }
      return await this.configStatsig.createFeatureFlagRule(
        featureFlagID,
        ruleID,
        paymentType,
        resolveMerchantId(this.context, 'setup.merchant.configureStatsig', merchantId)
      );
    } else if (action === 'delete') {
      return await this.configStatsig.deleteFeatureFlagRule(featureFlagID, ruleID);
    } else if (action === 'get') {
      return await this.configStatsig.getFeatureFlagRules(featureFlagID);
    } else {
      throw new Error(
        `configureStatsig: unknown action "${action}". Expected "create", "delete", or "get".`
      );
    }
  }
}
