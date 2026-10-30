import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class CybersourceFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const apiKeyValue = this.getPropertyValue(processorData, 'Key');
    const sharedSecretValue = this.getPropertyValue(processorData, 'Shared Secret');
    const merchantId = this.getPropertyValue(processorData, 'Merchant ID');
    const EnvironmentValue = this.getPropertyValue(processorData, 'Environment (test, live)');
    const use3DSReview = this.getPropertyValue(
      processorData,
      'Use “Review” status for 3DS (Yes or No)'
    );
    const deactivateShipTo = this.getPropertyValue(
      processorData,
      'Deactivate “ShipTo” object (“Yes” or “No”)'
    );

    await this.fillDataInInput({ placeholder: 'Key', text: apiKeyValue });
    await this.fillDataInInput({ placeholder: 'Shared Secret', text: sharedSecretValue });
    await this.fillDataInInput({ placeholder: 'Merchant ID', text: merchantId });
    await this.fillDataInInput({ placeholder: 'Environment (test, live)', text: EnvironmentValue });
    await this.fillDataInInput({
      placeholder: 'Use “Review” status for 3DS (Yes or No)',
      text: use3DSReview,
    });
    await this.fillDataInInput({
      placeholder: 'Deactivate “ShipTo” object (“Yes” or “No”)',
      text: deactivateShipTo,
    });

    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
