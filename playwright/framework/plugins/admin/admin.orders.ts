import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { resolveMerchantId, resolveOrderToken } from '../../resolve';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export interface GoToOrderParams {
  /** Defaults to the order created by a previous setup.order action. */
  orderToken?: string;
  /** Defaults to the merchant created by a previous setup.merchant action. */
  merchantId?: string;
}

export interface AssertStatusParams {
  status: OrderStatusTypes;
}

export interface CapturePartialParams {
  amount: number;
}

export interface RefundPartialParams {
  amount: number;
  language: LanguageCodes;
}

export interface AssertActivityLogParams {
  status: string;
}

export interface FilterByFraudStatusParams {
  status: string;
}

export interface OpenFiltersAndSelectFieldParams {
  field_name: string;
}

export interface SelectComboboxItemsParams {
  field_name: string; // e.g., 'payment_status' or 'payment-status' (hyphens auto-converted)
  items: string[]; // option values, e.g., ['processed', 'cancelled']
  search?: string; // optional search term to filter options before selecting
}

export interface AssertSplitTrackingPathNameParams {
  pathNames: string[];
}

export class PluginAdminOrders extends FrameworkPlugin {
  pluginBaseName = 'admin.orders';

  pageObject!: AdminOrderDetailsPage;
  ordersListPage!: AdminOrdersPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new AdminOrderDetailsPage(context.page);
    this.ordersListPage = new AdminOrdersPage(context.page);
  }

  /** @description Navigates to the order details page. Both values are optional: orderToken defaults to the order created by a previous setup.order action, and merchantId to the merchant from a previous setup.merchant action. Specs that still provision in beforeAll fall back to the legacy globals. Pass them explicitly (or with ref()) to make the dependency visible. */
  async $tf_goToOrder(params: GoToOrderParams = {}) {
    await this.pageObject.goToOrderDetails(
      resolveMerchantId(this.context, 'admin.orders.goToOrder', params.merchantId),
      resolveOrderToken(this.context, 'admin.orders.goToOrder', params.orderToken)
    );
  }

  /** @description Asserts the payment status displayed in the order details page. */
  async $tf_assertStatus({ status }: AssertStatusParams) {
    await this.pageObject.assertPaymentStatus(status);
  }

  /** @description Captures the total amount of the order via the actionable menu. */
  async $tf_captureTotal() {
    await this.pageObject.captureTotalOrder();
  }

  /** @description Captures a partial amount of the order via the actionable menu. */
  async $tf_capturePartial({ amount }: CapturePartialParams) {
    await this.pageObject.capturePartialOrder(amount);
  }

  /** @description Refunds the total amount of the order via the actionable menu. */
  async $tf_refundTotal() {
    await this.pageObject.refundTotalOrder();
  }

  /** @description Refunds a partial amount of the order via the actionable menu. */
  async $tf_refundPartial({ amount, language }: RefundPartialParams) {
    await this.pageObject.refundPartialOrder(amount);
  }

  /** @description Voids the order via the actionable menu, selecting a void reason and confirming. */
  async $tf_void() {
    await this.pageObject.voidOrder();
  }

  /** @description Asserts that the activity log contains an entry matching the given status key from the activity registry translations. */
  async $tf_assertActivityLog({ status }: AssertActivityLogParams) {
    await this.pageObject.assertActivitySequenceInOrder([status]);
  }

  /** @description Opens the more-filters panel and selects the given fraud status option in the orders list. */
  async $tf_filterByFraudStatus({ status }: FilterByFraudStatusParams) {
    await this.ordersListPage.selectFraudStatus(status);
  }

  /** @description Opens the advanced filters panel and selects a specific filter field by name. */
  async $tf_openFiltersAndSelectField({ field_name }: OpenFiltersAndSelectFieldParams) {
    await this.context.page.getByTestId('advanced-filters-button-more').click();
    await this.context.page.getByTestId(`advanced-filters-button-options-${field_name}`).click();
  }

  /** @description Interacts with a dynamic combobox filter. Detects the combobox trigger by field name, opens it, optionally searches, and selects one or more items. field_name supports both hyphen and underscore formats (e.g., payment-status or payment_status). */
  async $tf_selectComboboxItems({ field_name, items, search }: SelectComboboxItemsParams) {
    const fieldKey = field_name.replace(/-/g, '_');
    const trigger = this.context.page.getByTestId(`${fieldKey}-combobox-container-trigger`);

    await expect(trigger, `Combobox trigger for "${fieldKey}" not found`).toBeVisible({
      timeout: 5000,
    });
    await trigger.click();

    if (search) {
      const input = this.context.page.getByTestId(`${fieldKey}-combobox-input-search`);
      await expect(input).toBeVisible();
      await input.fill(search);
    }

    for (const item of items) {
      const option = this.context.page.getByTestId(`${fieldKey}-option-${item}`);
      await expect(option, `Option "${item}" not found in combobox "${fieldKey}"`).toBeVisible();
      await option.click();
    }

    // Close the combobox dropdown so the filter is applied to the table
    await trigger.click();
  }

  /** @description Asserts that the orders table contains at least one order row. */
  async $tf_assertAtLeastOneOrder() {
    await expect(
      this.ordersListPage.rowAllOrders.first(),
      'Expected at least one order in the orders table'
    ).toBeVisible();
  }

  /** @description Asserts that at least one of the given split tracking path names is visible in the order details page. */
  async $tf_assertSplitTrackingPathName({ pathNames }: AssertSplitTrackingPathNameParams) {
    await this.pageObject.assertSplitTrackingPathName(pathNames);
  }
}
