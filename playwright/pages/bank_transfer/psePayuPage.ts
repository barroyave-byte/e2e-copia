import { Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';

export class PayuPseRedirectionPage extends CommonsActions {
  readonly page: Page;
  readonly buttonCall: Locator;
  readonly buttonDebug: Locator;
  readonly buttonContinueTotheBank: Locator;
  readonly buttonRedirectButton: Locator;
  readonly inputSolicitDate: Locator;
  readonly inputProcessorDate: Locator;
  readonly inputAuthorizationID: Locator;
  readonly inputTransactionStatus: Locator;
  readonly labelCallMessage: Locator;
  readonly labelEmailPlaceholder: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.buttonDebug = page.locator('#btnDebug');
    this.buttonCall = page.locator('#btnCall');
    this.buttonRedirectButton = this.page.locator('#btnReturnToPPE');
    this.buttonContinueTotheBank = page.getByRole('button', { name: 'Ir al Banco' });
    this.inputSolicitDate = page.locator('#txtSoliciteDate');
    this.inputAuthorizationID = page.locator('#txtAuthorizationID');
    this.inputProcessorDate = page.locator('#txtBankProcessDate');
    this.inputTransactionStatus = page.locator('#ddTransactionState');
    this.labelEmailPlaceholder = page.getByPlaceholder('Ej: correo@pse.com.co');
    this.labelCallMessage = this.page.locator('#lblMessage');
  }

  async enterPersonalDetails() {
    await this.fillInputField(this.labelEmailPlaceholder, 'pruebas@payulatam.com');
    await this.page.waitForTimeout(2000);
    await this.isButtonEnabled(this.buttonContinueTotheBank);
    await this.buttonContinueTotheBank.click();
  }

  async processTransfer({ status = 'APPROVED' } = {}) {
    const errorMessage = 'The form field soliciteDate is not visible';
    await this.enterPersonalDetails();
    await this.ensureVisibleToClick(this.buttonDebug);
    await this.ensureVisible(this.inputSolicitDate, {
      errorMessage,
    });

    const currentDate = await this.inputSolicitDate.inputValue();

    await this.fillInputField(this.inputProcessorDate, currentDate);
    await this.fillInputField(this.inputAuthorizationID, '1234');

    if (status == 'FAILED') {
      await this.inputTransactionStatus.selectOption({ value: status });
    }
    await this.clickAndVerifyLabel(this.buttonCall, this.labelCallMessage);
    await this.ensureVisibleToClick(this.buttonRedirectButton);
  }
}
