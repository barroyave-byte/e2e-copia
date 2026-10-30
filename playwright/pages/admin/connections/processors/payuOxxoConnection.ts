import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { PayuOxxoCashProcessor } from '@support/interfaces/payment_processors/payuOxxoCashProcessor';

export class PayUOxxoConnection extends BaseProcessorPage {
  async configure(
    processorData: PayuOxxoCashProcessor,
    languageCode?: LanguageCodes
  ): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputExternalMerchantId.fill(processorData.external_merchant_id);
    await this.inputPrivateKey.fill(processorData.private_api_key);
    await this.inputPublicKey.fill(processorData.public_api_key);
    await this.inputAccountId.fill(processorData.extra_params.account_id);

    await this.clickOnConfigureProcessor();
  }
}
