import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class AccertifyFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const username = this.getPropertyValue(processorData, 'Username');
    const password = this.getPropertyValue(processorData, 'Password');
    const env = this.getPropertyValue(processorData, 'Environment');

    await this.antiFraudInput('PASSWORD').fill(password);
    await this.antiFraudInput('USERNAME').fill(username);
    await this.antiFraudInput('ENV').fill(env);

    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
