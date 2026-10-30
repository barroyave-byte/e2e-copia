import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class OpenpayConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputExternalMerchantId.fill(processorData.external_merchant_id);
    await this.inputPrivateKey.fill(processorData.private_api_key);

    if (processorData.hasOwnProperty('public_api_key')) {
      await this.inputPublicKey.fill(processorData.public_api_key);

      if (processorData.extra_params) {
        const extraParams = processorData.extra_params as Record<string, any>;

        if (extraParams && extraParams.group_id) {
          await this.inputGroupId.fill(extraParams.group_id);
        }

        if (extraParams && extraParams.store_id) {
          await this.inputStoreId.fill(extraParams.store_id);
        }
      }
    }
    // Enable 3DS authentication if configured (BEFORE selecting operation)
    if (processorData.enable_3ds_authentication) {
      await this.toggle3DSAuthentication();
    }

    await this.clickOperationPayment(processorData);

    // Configure Deuna 3DS if specified (AFTER enabling general 3DS)
    if (
      processorData.enable_3ds_authentication &&
      processorData.three_ds_processing_provider === 'deuna'
    ) {
      await this.toggleSecurityMethods();

      await expect(this.checkboxAllowDeuna3DS).toBeVisible();
      await this.checkboxAllowDeuna3DS.click();

      await this.configureDeunaThreeDS(processorData);
    }

    await this.clickOnConfigureProcessor();
  }
}
