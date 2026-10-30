import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class SiftFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const apiKeyValue = this.getPropertyValue(processorData, 'Api key');
    const accountIdValue = this.getPropertyValue(processorData, 'Account id');

    await this.fillDataInInput({ placeholder: 'Api key', text: apiKeyValue });
    await this.fillDataInInput({ placeholder: 'Account id', text: accountIdValue });
    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
