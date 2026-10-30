import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class ConektaConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputPublicKey.fill(processorData.public_api_key);
    await this.inputPrivateKey.fill(processorData.private_api_key);

    await this.clickOperationPayment(processorData);
    await this.clickOnConfigureProcessor();
  }
}
