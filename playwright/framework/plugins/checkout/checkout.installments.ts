import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';

interface SelectInstallmentsParams {
  installments: InstallmentQuantity;
}

export interface AssertInstallmentsResponseParams {
  expectedInstallments: InstallmentQuantity;
}

export class PluginCheckoutInstallments extends FrameworkPlugin {
  pluginBaseName = 'checkout.installments';

  pageObject!: PaymentDeunaNowPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new PaymentDeunaNowPage(context.page);
  }

  /** @description Selects the given number of MSI (meses sin intereses) installments from the dropdown in the checkout payment widget. */
  async $tf_selectMSI({ installments }: SelectInstallmentsParams) {
    await this.pageObject.selectInstallmentsMSI(installments);
  }

  /** @description Selects the given number of MCI (meses con intereses) installments from the dropdown in the checkout payment widget. */
  async $tf_selectMCI({ installments }: SelectInstallmentsParams) {
    await this.pageObject.selectInstallmentsMCI(installments);
  }

  /** @description Asserts that the MSI installments dropdown is visible, confirming that installment options have loaded in the payment widget. */
  async $tf_assertInstallmentsLoaded() {
    await this.pageObject.assertInstallmentsMSI();
  }

  /** @description Waits for the installments API response and verifies that the expected installment count is present in the returned plans. */
  async $tf_assertInstallmentsResponse({ expectedInstallments }: AssertInstallmentsResponseParams) {
    await this.pageObject.waitResponseFromInstallments();
    await this.pageObject.waitForInstallmentsResponse();
    const totalAmount = await this.pageObject.getTotalAmountWithInterest(expectedInstallments);
    expect(
      totalAmount,
      `Expected installments response to contain a plan for ${expectedInstallments} installments`
    ).toBeGreaterThan(0);
  }
}
