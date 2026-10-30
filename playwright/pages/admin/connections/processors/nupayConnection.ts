import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { NupayProcessor } from '@support/interfaces/payment_processors/nupayProcessor';

export class NupayConnection extends BaseProcessorPage {
  async configure(processorData: NupayProcessor, languageCode?: LanguageCodes): Promise<void> {

    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillPublicKey(processorData.public_api_key);

    await this.fillPrivateKey(processorData.private_api_key);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    await this.fillConfigName(processorData.name)

    await this.fillConfigExtraParams(JSON.stringify(processorData.extra_params));

    await this.fillConfigAssociationMode(processorData.authorization_association_mode);

    await this.clickOnConfigureProcessor();
  }
}
