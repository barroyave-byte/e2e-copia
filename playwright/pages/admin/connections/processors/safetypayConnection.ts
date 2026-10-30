import { BaseProcessorPage } from '../baseConfigConnectionPage';
import { SafetypayProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class SafetypayConnection extends BaseProcessorPage {
  async configure(processor: SafetypayProcessor, languageCode?: LanguageCodes) {
    await this.fillProcessorName(processor.name);

    await this.selectCurrencyByCurrency(processor.currency_iso3);

    await this.fillPrivateKey(processor.private_api_key);

    await this.fillSignatureKey(processor.extra_params.signature_key);

    await this.fillExpressCheckout(processor.extra_params.express_checkout);

    await this.fillForex(processor.extra_params.forex);

    await this.fillForexCurrency(processor.extra_params.forex_currency);

    await this.fillExpirationTimeMinutes(processor.extra_params.expiration_time_minutes);

    await this.clickOnConfigureProcessor();
  }
}
