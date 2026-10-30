import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { ProsaProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class ProsaConnection extends BaseProcessorPage {
  async configure(processorData: ProsaProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.inputProcessorName.fill(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    if (processorData.extra_params) {
      await this.fillExtraParamsFields(processorData.extra_params);
    }

    await this.togglePartialRefund();
    if (processorData.transaction_config?.refund_cutoff_days !== undefined) {
      await this.inputPartialRefundCutoffDays.fill(processorData.transaction_config.refund_cutoff_days.toString());
    }
    await this.clickOnConfigureProcessor();
  }
}
