import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class ClearsalebrasilFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const environmentValue = this.getPropertyValue(processorData, 'Ambiente (test ou live)');
    const passwordValue = this.getPropertyValue(processorData, 'Senha');
    const loginNameValue = this.getPropertyValue(processorData, 'Login / Nome');

    await this.antiFraudInput('ENV').fill(environmentValue);
    await this.antiFraudInput('SHARED_SECRET').fill(passwordValue);
    await this.antiFraudInput('ORGANIZATION_ID').fill(loginNameValue);

    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
