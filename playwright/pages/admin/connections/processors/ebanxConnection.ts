import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { EbanxProcessor } from '@support/interfaces/payment_processors';

export class EbanxConnection extends BaseProcessorPage {
  async configure(processorData: EbanxProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputPublicKey.fill(processorData.public_api_key);
    await this.inputPrivateKey.fill(processorData.private_api_key);
    await this.switchAllowSecurityMethod.click();
    await this.clickOnCheckboxAllowDeuna3DS();
    await this.configureDeunaThreeDS(processorData);

    await this.clickOnConfigureProcessor();
  }
}
