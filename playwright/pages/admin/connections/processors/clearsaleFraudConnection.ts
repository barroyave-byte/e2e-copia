import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { expect } from '@playwright/test';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class ClearsaleFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const apiKeyValue = this.getPropertyValue(processorData, 'Api key');
    const clientSecretValue = this.getPropertyValue(processorData, 'Client secret');
    const clientIdValue = this.getPropertyValue(processorData, 'Client Id');
    const environmentValue = this.getPropertyValue(processorData, 'Environment (test, live)');

    await this.antiFraudInput('ENV').fill(environmentValue);
    await this.page
      .getByTestId('connections-input-antifraud-SHARED_SECRET')
      .fill(clientSecretValue);
    await this.antiFraudInput('ORGANIZATION_ID').fill(clientIdValue);
    await this.antiFraudInput('API_KEY').fill(apiKeyValue);

    await this.clickOnConfigureProcessor();
  }
}
