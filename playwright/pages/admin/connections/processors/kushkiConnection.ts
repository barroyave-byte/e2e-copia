import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { KushkiProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect } from '@playwright/test';

export class KushkiConnection extends BaseProcessorPage {
  async configure(processorData: KushkiProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputPublicKey.fill(processorData.public_api_key);
    await this.inputPrivateKey.fill(processorData.private_api_key);

    if (processorData.tokenize_with_gateway) {
      await this.togglePSPTokenization();
    }

    if (
      processorData.enable_3ds_authentication &&
      processorData.three_ds_processing_provider === 'deuna'
    ) {
      await this.toggleSecurityMethods();

      await expect(this.checkboxAllowDeuna3DS).toBeVisible();
      await this.checkboxAllowDeuna3DS.click();

      await this.configureDeunaThreeDS(processorData);
    }

    await this.clickOperationPayment(processorData);

    await this.configureMultiplePartialCaptureSettings(processorData);

    await this.clickOnConfigureProcessor();
  }
}
