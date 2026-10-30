import { BaseProcessor } from '@support/interfaces/payment_processors';
import { BaseProcessorPage } from '../baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class PlaceToPayConnection extends BaseProcessorPage {
  async configure(processor: BaseProcessor, languageCode?: LanguageCodes) {
    await this.fillProcessorName(processor.name);

    await this.selectCurrencyByCurrency(processor.currency_iso3);

    await this.fillExternalMerchantId(processor.external_merchant_id);

    await this.fillPrivateKey(processor.private_api_key);

    await this.clickOnConfigureProcessor();
  }
}
