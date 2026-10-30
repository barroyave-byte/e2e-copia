import { expect } from '@playwright/test';
import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class MercadoPagoConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputExternalMerchantId.fill(processorData.external_merchant_id);
    await this.inputPrivateKey.fill(processorData.private_api_key);

    await this.clickOperationPaymentIfVisible(processorData);

    if (
      processorData.enable_3ds_authentication &&
      processorData.three_ds_processing_provider === 'deuna'
    ) {
      await expect(this.checkboxEnable3DS).toBeVisible();
      await this.checkboxEnable3DS.click();
      await this.configureDeunaThreeDS(processorData);
    }

    // Proceed to the next step regardless
    await this.clickOnConfigureProcessor();
  }
}
