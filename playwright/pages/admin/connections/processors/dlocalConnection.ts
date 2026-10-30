import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { DlocalProcessor } from '@support/interfaces/payment_processors/dlocalProcessor';

export class DlocalConnection extends BaseProcessorPage {
  async configure(processorData: DlocalProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.inputPrivateKey.fill(processorData.dlocal.login);
    await this.inputPublicKey.fill(processorData.dlocal.trans_key);
    await this.inputExternalMerchantId.fill(processorData.dlocal.secret_key);

    await this.clickOperationPayment(processorData);

    const automaticCapture = processorData?.automatic_capture;
    if (!automaticCapture) {
      if (processorData?.multiple_partial_capture_mode === 'offline') {
        await this.toggleDeunaMultiplePartialCapture();
      }

      const cutoffDays = processorData?.capture_cutoff_days;
      if (cutoffDays) {
        await this.fillCutoffDays(cutoffDays.toString());
      }
    }

    await this.clickOnConfigureProcessor();
  }
}
