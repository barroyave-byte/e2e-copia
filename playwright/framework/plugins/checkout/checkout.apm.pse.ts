import { Context, FrameworkPlugin } from '../interface';
import { PayuPseFormPage } from '@pages/explore/forms/payuPseFormPage';
import { PayuPseRedirectionPage } from '@pages/bank_transfer/psePayuPage';
import { BaseUserData } from '@support/interfaces/user_data/baseUserData';

export interface FillPseFormParams extends BaseUserData {
  bankName?: string;
}

export class PluginCheckoutApmPse extends FrameworkPlugin {
  pluginBaseName = 'checkout.apm.pse';

  pseForm!: PayuPseFormPage;
  pseRedirection!: PayuPseRedirectionPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pseForm = new PayuPseFormPage(context.page);
    this.pseRedirection = new PayuPseRedirectionPage(context.page);
  }

  /** @description Selects a financial institution from the PSE form dropdown by bank name. */
  async $tf_selectFinancialInstitution({ bankName }: { bankName: string }) {
    await this.pseForm.selectFinancialInstitution(bankName);
  }

  /** @description Selects the natural person type in the PSE form dropdown. */
  async $tf_selectPersonType() {
    await this.pseForm.selectPersonType();
  }

  /** @description Fills in the user document (ID number) field in the PSE form. */
  async $tf_fillUserDocument({ document }: { document: string }) {
    await this.pseForm.fillUserDocument(document);
  }

  /** @description Fills in the account holder name field in the PSE form. */
  async $tf_fillHolderName({ holderName }: { holderName: string }) {
    await this.pseForm.fillHolderName(holderName);
  }

  /** @description Fills in the phone number field in the PSE form. */
  async $tf_fillPhoneNumber({ phone }: { phone: string }) {
    await this.pseForm.fillPhoneNumber(phone);
  }

  /** @description Fills in all fields of the PSE form including financial institution, document, person type, holder name, and phone number. */
  async $tf_fillPseForm(formData: FillPseFormParams) {
    await this.pseForm.fillPsePayuForm(formData);
  }

  /** @description Clicks the Go To Site button in the PSE form to proceed to the bank redirection. */
  async $tf_clickGoToSiteButton() {
    await this.pseForm.clickGoToSiteButton();
  }

  /** @description Waits for the Go To Site button to become visible in the PSE payment widget. */
  async $tf_waitGoToSiteButtonVisible() {
    await this.pseForm.waitForGoToSiteButtonToBeVisible();
  }

  /** @description Processes the PSE bank redirection flow, filling in transfer details and redirecting back to the merchant. Accepts an optional status parameter (default APPROVED). */
  async $tf_processRedirection({ status }: { status?: string } = {}) {
    await this.pseRedirection.processTransfer({ status });
  }

  /** @description Enters the personal details (email) on the PSE bank redirection page and clicks continue to the bank. */
  async $tf_enterPersonalDetails() {
    await this.pseRedirection.enterPersonalDetails();
  }

  /** @description Asserts that the phone number input field is visible on the PSE form. */
  async $tf_assertPhoneNumberVisible() {
    await this.pseForm.assertPhoneNumberToBeVisible();
  }
}
