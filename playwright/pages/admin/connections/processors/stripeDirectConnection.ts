import { BaseProcessor } from '@support/interfaces/payment_processors';
import { BaseProcessorPage } from '../baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class StripeDirectConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    // Insert credentials
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputPrivateKey.fill(processorData.private_api_key);
    await this.inputPublicKey.fill(processorData.public_api_key);

    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
