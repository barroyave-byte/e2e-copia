import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class WorldpayConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillPrivateKey(processorData.private_api_key);

    await this.fillPublicKey(processorData.public_api_key);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    if (processorData.country_iso !== 'CO') {
      await this.clickOperationPayment(processorData);
    }

    await this.clickOnConfigureProcessor();
  }
}
