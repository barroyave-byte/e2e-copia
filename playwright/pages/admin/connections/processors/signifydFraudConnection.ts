import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BaseProcessor } from '@support/interfaces/payment_processors';

export class SignifydFraudConnection extends BaseProcessorPage {
  async configure(processorData: BaseProcessor): Promise<void> {
    const apiKeyValue = this.getPropertyValue(processorData, 'Api key');
    const teamNameValue = this.getPropertyValue(processorData, 'Team Name');
    const coverageRequestsValue = this.getPropertyValue(processorData, 'Coverage Requests');
    const decisionMechanismValue = this.getPropertyValue(processorData, 'Decision mechanism');
    const gatewayValue = this.getPropertyValue(processorData, 'Default Gateway name');
    const sellerDomainValue = this.getPropertyValue(processorData, 'Seller Domain URL');
    const sellerCreatedDateValue = this.getPropertyValue(
      processorData,
      'Domain creation date in the Seller platform'
    );
    const sellerEmailValue = this.getPropertyValue(processorData, 'Seller e-mail');
    const sellerPhoneValue = this.getPropertyValue(processorData, 'Seller phone');
    const sellerStreetAddressValue = this.getPropertyValue(processorData, 'Seller Street address');
    const sellerPostalCodeValue = this.getPropertyValue(processorData, 'Seller Postal Code');
    const sellerCityValue = this.getPropertyValue(processorData, 'Seller City');
    const sellerProvinceCodeValue = this.getPropertyValue(processorData, 'Seller Province Code');
    const sellerCountryCodeValue = this.getPropertyValue(processorData, 'Seller Country code');
    const sendAuthCodeValue = this.getPropertyValue(
      processorData,
      'Send Authorization code in Transaction Endpoint'
    );

    if (sendAuthCodeValue) {
      await this.page
        .getByPlaceholder('Send Authorization code in Transaction Endpoint (Yes or No)')
        .fill(sendAuthCodeValue);
    }
    await this.antiFraudInput('API_KEY').fill(apiKeyValue);
    await this.antiFraudInput('ACCOUNT_ID').fill(teamNameValue);
    await this.antiFraudInput('COVERAGE_REQUESTS').fill(coverageRequestsValue);
    await this.antiFraudInput('DECISION_MECHANISM').fill(decisionMechanismValue);
    await this.antiFraudInput('GATEWAY').fill(gatewayValue);
    await this.antiFraudInput('SELLER_DOMAIN').fill(sellerDomainValue);
    await this.antiFraudInput('SELLER_CREATED_DATE').fill(sellerCreatedDateValue);
    await this.antiFraudInput('SELLER_EMAIL').fill(sellerEmailValue);
    await this.antiFraudInput('SELLER_PHONE').fill(sellerPhoneValue);
    await this.antiFraudInput('SELLER_STREET_ADDRESS').fill(sellerStreetAddressValue);
    await this.antiFraudInput('SELLER_POSTAL_CODE').fill(sellerPostalCodeValue);
    await this.antiFraudInput('SELLER_CITY').fill(sellerCityValue);
    await this.antiFraudInput('SELLER_PROVINCE_CODE').fill(sellerProvinceCodeValue);
    await this.antiFraudInput('SELLER_COUNTRY_CODE').fill(sellerCountryCodeValue);

    await this.page.waitForTimeout(1000);
    await this.clickOnConfigureProcessor();
  }
}
