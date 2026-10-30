import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class UnlimitConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {

    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    await this.fillPrivateKey(processorData.private_api_key);

    if (processorData.enable_3ds_authentication) {
      await this.toggleSecurityMethods();
      await this.select3DSProcessorOption('psp');
    }

    await this.clickOperationPayment(processorData);
    await this.clickOnConfigureProcessor();
  }
}
