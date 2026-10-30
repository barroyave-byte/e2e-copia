import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { AplazoProcessor } from '@support/interfaces/payment_processors/aplazoProcessor';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class AplazoConnection extends BaseProcessorPage {
    async configure(processorData: AplazoProcessor, languageCode?: LanguageCodes): Promise<void> {

        await this.selectCurrencyByCurrency(processorData.currency_iso3);
        await this.fillProcessorName(processorData.name);
        await this.fillExternalMerchantId(processorData.external_merchant_id);
        await this.fillPrivateKey(processorData.private_api_key)

        await this.clickOnConfigureProcessor();
    }
}