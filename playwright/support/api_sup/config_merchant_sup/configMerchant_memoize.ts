import memoize from 'lodash.memoize';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { BaseProcessor } from '@support/interfaces/payment_processors/baseProcessor';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';

class ConfigMerchant {
  constructor() {
    this.basicSetup = memoize(
      this.basicSetup.bind(this),
      (country: CountryCodes, processor: BaseProcessor) => `${country}-${processor.name}`
    );
  }

  async basicSetup(country: CountryCodes, processor: BaseProcessor) {
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    const merchant = await merchantAuthService.createBasicMerchant({
      country: country,
    });
    await apiCallNewman.createPaymentProcessor(
      processor,
      merchant.merchantId,
      merchant.merchantToken
    );
    return merchant;
  }
}

export default new ConfigMerchant();
