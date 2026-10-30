import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId, resolveMerchantToken } from '../../resolve';
import { configureVaultWidget, createConfigurationV2 } from '@support/newman/apiCallNewman';
import type { ConfigurationV2, CreateConfigurationV2 } from '@support/newman/apiCallNewman';

/**
 * Merchant-side checkout configuration: what the widget renders before a test drives it.
 *
 * `configureVaultWidget` (115 uses), `createConfigurationV2` (50) and
 * `createCheckoutConfigVault` (35) were the third-largest block of setup that specs still had
 * to write by hand in `beforeAll`.
 */
export class PluginSetupCheckout extends FrameworkPlugin {
  pluginBaseName = 'setup.checkout';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Configures the Vault widget for the merchant (checkout config, network and elements config) so the widget renders the saved-cards and authentication experience the test expects. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_configureVaultWidget({
    config,
    merchantId,
    merchantToken,
  }: {
    config?: ConfigurationV2;
    merchantId?: string;
    merchantToken?: string;
  } = {}) {
    const action = 'setup.checkout.configureVaultWidget';

    return await configureVaultWidget(
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken),
      config
    );
  }

  /** @description Creates a V2 checkout configuration for the merchant (widget general config and/or elements config), e.g. to set user_experience.render_3ds_strategy or show_saved_cards_flow. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  async $tf_configureV2({
    widgetGeneralsConfig,
    elementsConfig,
    orderConfig,
    merchantId,
    merchantToken,
  }: CreateConfigurationV2 & { merchantId?: string; merchantToken?: string }) {
    const action = 'setup.checkout.configureV2';

    return await createConfigurationV2(
      { widgetGeneralsConfig, elementsConfig, orderConfig },
      resolveMerchantId(this.context, action, merchantId),
      resolveMerchantToken(this.context, action, merchantToken)
    );
  }
}
