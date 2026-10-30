import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class RiskifiedFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const shopUrl = this.getPropertyValue(processorData, 'Shop URL');
    const env = this.getPropertyValue(processorData, 'Environment (test or live)');
    const token = this.getPropertyValue(processorData, 'Auth Token');
    const enable3DS = this.getPropertyValue(
      processorData,
      'Enable 3DS recommendation ("Yes" or "No")'
    );

    await this.fillDataInInput({ placeholder: 'Shop URL', text: shopUrl });
    await this.fillDataInInput({ placeholder: 'Environment (test or live)', text: env });
    await this.fillDataInInput({ placeholder: 'Auth Token', text: token });
    await this.fillDataInInput({
      placeholder: 'Enable 3DS recommendation (“Yes” or “No”)',
      text: enable3DS,
    });
    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
