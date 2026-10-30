import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AmexProcessor } from '@support/interfaces/payment_processors/amexProcessor';

export class AmexConnection extends BaseProcessorPage {
  async configure(processorData: AmexProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    await this.configurationTextInput('acquirer_id').fill(processorData.acquirer_id);

    await this.configurationTextInput('terminalId').fill(processorData.extra_params.terminalId);

    await this.configurationTextInput('businessCode').fill(processorData.extra_params.businessCode);

    await this.configurationTextInput('approvalCodeLength').fill(
      processorData.extra_params.approvalCodeLength
    );

    await this.configurationTextInput('cardAcceptorName').fill(
      processorData.extra_params.cardAcceptorName
    );

    await this.configurationTextInput('cardAcceptorAddress').fill(
      processorData.extra_params.cardAcceptorAddress
    );

    await this.configurationTextInput('cardAcceptorCity').fill(
      processorData.extra_params.cardAcceptorCity
    );

    await this.configurationTextInput('cardAcceptorPostalCode').fill(
      processorData.extra_params.cardAcceptorPostalCode
    );

    await this.configurationTextInput('cardAcceptorStateCode').fill(
      processorData.extra_params.cardAcceptorStateCode
    );

    await this.configurationTextInput('countryCode').fill(processorData.extra_params.countryCode);

    await this.configurationTextInput('sellerId').fill(processorData.extra_params.sellerId);

    await this.configurationTextInput('sellerEmail').fill(processorData.extra_params.sellerEmail);

    await this.configurationTextInput('sellerPhone').fill(processorData.extra_params.sellerPhone);

    await this.configurationTextInput('reasonCode').fill(processorData.extra_params.reasonCode);

    await this.configurationTextInput('aavType').fill(processorData.extra_params.aavType);

    await this.configurationTextInput('processingCode').fill(
      processorData.extra_params.processingCode
    );

    await this.clickOperationPayment(processorData);
    await this.clickOnConfigureProcessor();
  }
}
