import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class KountFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const privateKey = this.getPropertyValue(processorData, 'Private Key');
    const env = this.getPropertyValue(processorData, 'Environment (test, live)');
    const AccountID = this.getPropertyValue(processorData, 'Account ID');

    await this.fillDataInInput({ placeholder: 'Private Key', text: privateKey });
    await this.fillDataInInput({ placeholder: 'Environment (test, live)', text: env });
    await this.fillDataInInput({ placeholder: 'Account ID', text: AccountID });
    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
