import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { SpeiOpmProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export class SpeiOpmConnection extends BaseProcessorPage {
  readonly inputPrivateKey: Locator;
  readonly inputCostCenter: Locator;
  readonly inputIntegratorCode: Locator;
  readonly inputSucursal: Locator;
  readonly inputBank: Locator;
  readonly inputTimeToExpire: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.inputPrivateKey = page.getByTestId(
      /^connections-configuration-value-input-(text|password)-privateKey$/
    );
    this.inputCostCenter = page.getByTestId(
      /^connections-configuration-value-input-(text|password)-costCenterCode$/
    );
    this.inputIntegratorCode = page.getByTestId(
      /^connections-configuration-value-input-(text|password)-integratorCode$/
    );
    this.inputSucursal = page.getByTestId(
      /^connections-configuration-value-input-(text|password)-branchCode$/
    );
    this.inputBank = page.getByTestId(
      /^connections-configuration-value-input-(text|password)-bankCode$/
    );
    this.inputTimeToExpire = this.configurationNumberInput('pending');
  }

  async fillInput({ locator, text }) {
    await expect(locator, `The input with locator ${text} is not visible`)
      .toBeVisible()
      .then(() => locator.fill(text));
  }

  async configure(processorData: SpeiOpmProcessor): Promise<void> {
    await this.fillProcessorName(processorData.name);
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.fillPublicKey(processorData?.public_api_key);

    await this.fillInput({
      locator: this.inputCostCenter,
      text: processorData?.extra_params.costCenterCode,
    });

    await this.fillInput({
      locator: this.inputIntegratorCode,
      text: processorData?.extra_params.integratorCode,
    });

    await this.fillInput({
      locator: this.inputSucursal,
      text: processorData?.extra_params.branchCode,
    });

    await this.fillInput({
      locator: this.inputBank,
      text: processorData?.extra_params.bankCode,
    });

    await this.fillInput({
      locator: this.inputPrivateKey,
      text: processorData?.extra_params.privateKey,
    });

    await this.fillInput({
      locator: this.inputTimeToExpire,
      text: processorData?.time_to_expire,
    });

    await this.clickOnConfigureProcessor();
  }
}
