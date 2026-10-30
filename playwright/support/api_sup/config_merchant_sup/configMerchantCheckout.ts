import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { ServiceFactory } from '@support/http';
import { SERVICE_KEYS } from '@support/http/types/ServiceTypes';

export default class ConfigMerchantCheckout {
  async basicSetup(country: CountryCodes) {
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    const merchant = await merchantAuthService.createBasicMerchantCheckout({
      country: country,
    });
    return merchant;
  }
}
