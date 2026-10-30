import { retryOperationWithAction } from '@support/utils/retries';
import { BaseRedirectionPage } from './baseRedirectionPage';

export class PayuPseRedirectionPage extends BaseRedirectionPage {
  async processRedirection(options?: object): Promise<void> {
    await this.enterPersonalDetails();

    await this.fillPSEForm(options);
  }

  private async enterPersonalDetails() {
    const emailLocator = this.page.getByPlaceholder('Ej: correo@pse.com.co');
    await this.fillInputField(emailLocator, 'pruebas@payulatam.com');

    const continueButtonLocator = this.page.getByRole('button', { name: 'Ir al Banco' });
    await this.isButtonEnabled(continueButtonLocator);
    await continueButtonLocator.click();

    // Under load, PSE re-hydrates this page right after the click and the
    // navigation to the bank-debug step gets dropped, leaving the form on
    // screen with the email still filled in. Re-click until it lands.
    const debugButtonLocator = this.page.locator('#btnDebug');
    await retryOperationWithAction(this.page, debugButtonLocator, 3, 5000, async () => {
      await continueButtonLocator.click();
    });
  }

  private async fillPSEForm({ status = 'APPROVED' } = {}) {
    const debugButtonLocator = this.page.locator('#btnDebug');
    await this.ensureVisibleToClick(debugButtonLocator);

    const currentDateLocator = this.page.locator('#txtSoliciteDate');
    await this.ensureVisible(currentDateLocator, {
      errorMessage: 'The form field soliciteDate is not visible',
    });

    const currentDate = await currentDateLocator.inputValue();

    const bankProcessorDateFieldLocator = this.page.locator('#txtBankProcessDate');
    await this.fillInputField(bankProcessorDateFieldLocator, currentDate);

    const authorizationIDLocator = this.page.locator('#txtAuthorizationID');
    await this.fillInputField(authorizationIDLocator, '1234');

    if (status == 'FAILED') {
      const transactionStatusLocator = this.page.locator('#ddTransactionState');

      await transactionStatusLocator.selectOption({ value: status });
    }

    const callButtonLocator = this.page.locator('#btnCall');
    const callLabelMessage = this.page.locator('#lblMessage');

    await this.clickAndVerifyLabel(callButtonLocator, callLabelMessage);

    const redirectButtonLocator = this.page.locator('#btnReturnToPPE');
    await this.ensureVisibleToClick(redirectButtonLocator);
  }
}
