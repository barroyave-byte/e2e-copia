import { BaseProcessor } from '@support/interfaces/payment_processors';
import { BaseProcessorPage } from '../baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class GlobalPayConnection extends BaseProcessorPage {
  async configure(processor: BaseProcessor, languageCode?: LanguageCodes) {
    await this.fillProcessorName(processor.name);

    await this.selectCurrencyByCurrency(processor.currency_iso3);

    await this.fillExternalMerchantId(processor.external_merchant_id);

    await this.fillPrivateKey(processor.private_api_key);

    await this.configurationTextInput('flow').fill(processor.flow);

    await this.configurationTextInput('flow_version').fill(processor.flow_version);

    await this.configurationTextInput('three_ds_internal_version').fill(
      processor.three_ds_internal_version
    );

    await this.clickOnConfigureProcessor();
  }
}
