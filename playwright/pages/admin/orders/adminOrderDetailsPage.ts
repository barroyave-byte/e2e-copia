import { expect, type Locator, type Page } from '@playwright/test';
import { AdminOperationType } from '@support/interfaces/adminOperationType';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { retryOperation, retryOperationReloadWithAction, retryUntil } from '@support/utils/retries';
import { assertResponseOk } from '@support/utils/responseAssertions';
import envConfig from '@support/envConfig';
import { CommonsActions } from '@pages/commonActions';
import { RiskLevel } from '@support/interfaces/riskOption';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ORDER_DETAILS_DATA_TEST_IDS } from './constants';
import { MERCHANT_SESSION_STORAGE_KEY } from '@pages/admin/constants/commons';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { slugifyForDataTestIdSegment } from '@pages/admin/utils/stringUtils';

const urlAdmin = envConfig.ADMIN_URL;

export class AdminOrderDetailsPage extends CommonsActions {
  readonly page: Page;
  public readonly labelPaymentDetails: Locator;
  public readonly labelPageTitle: Locator;
  public readonly tabPayment: Locator;
  public readonly tabSummary: Locator;
  public readonly tabSecurity: Locator;
  public readonly shippingAddressTitle: Locator;
  public readonly billingAddressTitle: Locator;
  public readonly buttonExpandDetails: Locator;
  readonly buttonActionable: Locator;
  readonly buttonPaymentHistory: Locator;
  readonly radiobuttonFull: Locator;
  readonly operationTypeTrigger: Locator;
  readonly buttonSaveRefund: Locator;
  readonly buttonSaveCapture: Locator;
  readonly buttonSaveAnnulment: Locator;
  readonly radiobuttonPartial: Locator;
  readonly buttonConfirmRefund: Locator;
  readonly buttonConfirmCapture: Locator;
  readonly buttonConfirmVoid: Locator;
  readonly inputAmountActionOrder: Locator;
  readonly selectReasonsVoid: Locator;
  readonly selectRefundReasonTrigger: Locator;
  readonly historyContainer: Locator;
  readonly historyList: Locator;
  readonly paymentHistoryEvents: Locator;
  readonly paymentHistoryStatusFields: Locator;
  readonly paymentHistoryProcessorFields: Locator;
  readonly customerCard: Locator;
  readonly customerFirstNameField: Locator;
  readonly customerLastNameField: Locator;
  readonly addressDetailField: (
    addressType: 'shipping' | 'billing',
    name:
      | 'firstName'
      | 'phone'
      | 'identityDocument'
      | 'city'
      | 'stateName'
      | 'zipcode'
      | 'countryCode'
      | 'address1'
  ) => Locator;
  readonly orderItemNameCell: (itemId: string) => Locator;
  readonly orderItemQuantityCell: (itemId: string) => Locator;
  readonly orderItemTotalAmountCell: (itemId: string) => Locator;
  readonly labelFlightDetailsTitle: Locator;
  readonly linkViewMetadata: Locator;
  readonly drawerMetadata: Locator;
  readonly selectors: AdminTranslations;

  //Locators
  constructor(
    page: Page,
    private languageCode: LanguageCodes = 'ES'
  ) {
    super(page);
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.buttonActionable = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.buttonActionable);
    this.buttonPaymentHistory = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonShowPaymentHistory
    );
    this.radiobuttonFull = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.radioTotal);
    this.operationTypeTrigger = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.operationTypeTrigger);
    this.labelPaymentDetails = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.tabPayment);
    this.labelPageTitle = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.pageTitle);
    this.tabPayment = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.tabPayment);
    this.tabSummary = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.tabSummary);
    this.tabSecurity = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.tabSecurity);
    this.buttonSaveRefund = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.buttonSaveRefund);
    this.buttonSaveCapture = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.buttonSaveCapture);
    this.buttonSaveAnnulment = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.buttonSaveAnnulment);
    this.radiobuttonPartial = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.radioPartial);
    this.buttonConfirmRefund = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonModalConfirmRefund
    );
    this.buttonConfirmCapture = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonModalConfirmCapture
    );
    this.buttonConfirmVoid = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonModalConfirmAnnulment
    );
    this.selectReasonsVoid = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.selectAnnulmentReason);
    this.selectRefundReasonTrigger = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.selectRefundReason
    );
    this.inputAmountActionOrder = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.inputAmount);
    this.historyContainer = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.drawerPaymentHistory);
    this.historyList = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.stepContainerDrawerPaymentHistory
    );
    this.paymentHistoryEvents = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.paymentHistoryEvent);
    this.paymentHistoryStatusFields = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.paymentHistoryStatusField
    );
    this.paymentHistoryProcessorFields = page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.paymentHistoryProcessorField
    );
    this.customerCard = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.customerCard);
    this.customerFirstNameField = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.customerName);
    this.customerLastNameField = page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.customerLastName);
    this.addressDetailField = (addressType, name) => {
      const shippingFieldIds = {
        firstName: ORDER_DETAILS_DATA_TEST_IDS.shippingName,
        phone: ORDER_DETAILS_DATA_TEST_IDS.customerPhone,
        identityDocument: ORDER_DETAILS_DATA_TEST_IDS.customerDocumentId,
        city: ORDER_DETAILS_DATA_TEST_IDS.shippingCity,
        stateName: ORDER_DETAILS_DATA_TEST_IDS.shippingState,
        zipcode: ORDER_DETAILS_DATA_TEST_IDS.shippingPostalCode,
        countryCode: ORDER_DETAILS_DATA_TEST_IDS.shippingCountry,
        address1: ORDER_DETAILS_DATA_TEST_IDS.shippingAddress1,
      } as const;
      const dataTestId =
        addressType === 'billing'
          ? ORDER_DETAILS_DATA_TEST_IDS.billingAddressField(name)
          : shippingFieldIds[name];
      return page.getByTestId(dataTestId);
    };
    this.orderItemNameCell = (itemId) =>
      page.locator(`[data-testid="${ORDER_DETAILS_DATA_TEST_IDS.orderItemNameCell(itemId)}"] p`);
    this.orderItemQuantityCell = (itemId) =>
      page.locator(
        `[data-testid="${ORDER_DETAILS_DATA_TEST_IDS.orderItemQuantityCell(itemId)}"] p`
      );
    this.orderItemTotalAmountCell = (itemId) =>
      page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.orderItemTotalAmountCell(itemId));

    this.shippingAddressTitle = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.accordionShippingAddressTitle
    );
    this.billingAddressTitle = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.accordionBillingAddressTitle
    );
    this.buttonExpandDetails = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonAirlineInformationDetail
    );
    this.labelFlightDetailsTitle = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.titleAirlineInformation
    );
    this.linkViewMetadata = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.linkViewMetadata);
    this.drawerMetadata = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.codeBlockDrawerTitle);
  }

  private activityCheckpoint(activityType: string): Locator {
    return this.page
      .locator(`[data-testid^="${ORDER_DETAILS_DATA_TEST_IDS.visibilityRowPrefix}"]`)
      .filter({
        has: this.page.getByTestId(
          ORDER_DETAILS_DATA_TEST_IDS.activityCheckpointLabel(activityType)
        ),
      });
  }

  //Actions
  override async setMerchantSessionStorage(merchantId: string, targetPage?: Page): Promise<void> {
    await super.setMerchantSessionStorage(merchantId, targetPage);
  }

  async goToOrderDetails(merchantId: string, orderToken: string): Promise<void> {
    await this.page.addInitScript(({ key, value }) => window.sessionStorage.setItem(key, value), {
      key: MERCHANT_SESSION_STORAGE_KEY,
      value: merchantId,
    });

    await this.page.goto(`${urlAdmin}/orders/${orderToken}`, { waitUntil: 'domcontentloaded' });

    await expect(this.labelPageTitle, 'The order details title is not visible').toBeVisible({
      timeout: 35000,
    });
  }

  async reloadOrderDetails(): Promise<void> {
    await this.page.reload();
    await expect(this.labelPageTitle, 'The order details title is not visible').toBeVisible({
      timeout: 35000,
    });
  }

  async openPaymentTab(): Promise<void> {
    await expect(this.tabPayment, 'The payment tab is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.tabPayment.click();
    await expect(this.labelPaymentDetails, 'The payment details label is not visible').toBeVisible({
      timeout: 40000,
    });
  }

  async openSummaryTab(): Promise<void> {
    await expect(this.tabSummary, 'The summary tab is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.tabSummary.click();
  }

  async clickOnActionableButton(): Promise<void> {
    try {
      await expect(this.buttonActionable, 'The actionable button is not enabled').toBeEnabled({
        timeout: 35000,
      });
    } catch (error) {
      await this.page.reload();
      await expect(
        this.buttonActionable,
        'The actionable button is not visible after reload'
      ).toBeVisible();
      await expect(
        this.buttonActionable,
        'The actionable button is not enabled after reload'
      ).toBeEnabled();
    }

    await this.buttonActionable.click();
  }

  async assertActionableButtonVisible(): Promise<void> {
    await expect(
      this.buttonActionable,
      'The payment actions button is not visible for a user with payment-operation permission'
    ).toBeVisible({ timeout: 40000 });
  }

  async clickOnPaymentHistoryButton(): Promise<void> {
    await expect(
      this.buttonPaymentHistory,
      'The payment history button is not visible'
    ).toBeVisible();

    if (await this.historyContainer.isVisible().catch(() => false)) {
      return;
    }

    await this.buttonPaymentHistory.click();

    await expect(this.historyContainer, 'The payment history drawer did not open').toBeVisible({
      timeout: 15000,
    });
  }

  async clickOnOperationOption(operation: AdminOperationType): Promise<void> {
    const operationLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.operationButton(operation)
    );
    await expect(operationLocator, `The operation option ${operation} is not visible`)
      .toBeVisible()
      .then(() => operationLocator.click());
  }

  async captureTotalOrder(): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('capture');
    await this.selectTotalOptionOrderAction(true);
    await this.confirmCapture();
  }

  async capturePartialOrder(amount: number): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('capture');
    await this.selectPartialOptionOrderAction(amount, true);
    await this.confirmCapture();
  }

  async confirmCapture(): Promise<void> {
    await this.runOrderOperation('capture', async () => {
      await expect(this.buttonConfirmCapture, 'The confirm capture button is not visible')
        .toBeVisible()
        .then(() => this.buttonConfirmCapture.click());
    });
  }

  async confirmRefund(): Promise<void> {
    await expect(this.buttonConfirmRefund, 'The confirm refund button is not visible')
      .toBeVisible()
      .then(() => this.buttonConfirmRefund.click());
  }

  async confirmVoid(): Promise<void> {
    await this.runOrderOperation('void', async () => {
      await this.ensureVisibleToClick(
        this.buttonConfirmVoid.first(),
        undefined,
        'The confirm void button is not visible'
      );
    });
  }

  /**
   * Triggers an order operation and resolves once the page shows its result.
   * After the operation POST succeeds the admin re-fetches the order details
   * (1s later for a refund, 3s for a capture or void); until then the page
   * still renders the previous order state, so a status read or a preprod
   * webhook sent earlier sees the order before the operation existed.
   */
  private async runOrderOperation(
    operation: 'capture' | 'void' | 'refund',
    confirm: () => Promise<void>
  ): Promise<void> {
    const operationPathPattern = new RegExp(`/merchants/orders/([^/]+)/${operation}$`);
    let orderDetailsPath: string | undefined;

    const operationPromise = this.page.waitForResponse(
      (response) => {
        if (response.request().method() !== 'POST') return false;
        const orderToken = new URL(response.url()).pathname.match(operationPathPattern)?.[1];
        if (!orderToken) return false;
        orderDetailsPath = `/merchants/orders/${orderToken}`;
        return true;
      },
      { timeout: 60000 }
    );
    const orderRefreshPromise = this.page.waitForResponse(
      (response) =>
        orderDetailsPath !== undefined &&
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname.endsWith(orderDetailsPath),
      { timeout: 60000 }
    );
    // The refresh never comes when the operation fails; that failure is reported by assertResponseOk.
    orderRefreshPromise.catch(() => undefined);

    await confirm();
    const response = await operationPromise;
    await assertResponseOk(response, operation);
    const orderRefresh = await orderRefreshPromise;
    expect(
      orderRefresh.ok(),
      `The order details refresh after the ${operation} returned ${orderRefresh.status()}`
    ).toBe(true);
  }

  async refundTotalOrder(): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('refund');
    await this.selectTotalOptionOrderAction();
    await this.runOrderOperation('refund', () => this.confirmRefund());
  }

  async selectReasonVoid(): Promise<void> {
    await this.ensureVisibleToClick(this.selectReasonsVoid);
    const secondReason = this.page.locator('div[role="listbox"] div[role="option"]').nth(2);
    await secondReason.click();
  }

  async voidOrder(): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('void');
    await this.selectReasonVoid();
    await expect(this.buttonSaveAnnulment, 'The save button is not visible').toBeVisible();
    await this.buttonSaveAnnulment.click();
    await this.confirmVoid();
  }

  async refundPartialOrder(amount: number): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('refund');
    await this.selectPartialOptionOrderAction(amount, false);
    await this.runOrderOperation('refund', () => this.confirmRefund());
  }

  async partialRefundRemainingAmount(amount?: number): Promise<void> {
    await this.clickOnActionableButton();
    await this.clickOnOperationOption('refund');
    await this.selectPartialOptionOrderAction(amount, false);
    await this.runOrderOperation('refund', () => this.confirmRefund());
  }

  async selectTotalOptionOrderAction(isCapture: boolean = false): Promise<void> {
    await expect(
      this.operationTypeTrigger,
      'The operation type selector is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.operationTypeTrigger.click();
    await expect(this.radiobuttonFull, 'The total operation option is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.radiobuttonFull.click();

    if (isCapture) {
      await expect(this.buttonSaveCapture, 'The save button is not visible').toBeVisible({
        timeout: 40000,
      });
      await this.buttonSaveCapture.click();
    } else {
      await expect(this.buttonSaveRefund, 'The save button is not visible').toBeVisible({
        timeout: 40000,
      });
      await this.buttonSaveRefund.click();
    }
  }

  async selectPartialRefundReason(): Promise<void> {
    await expect(
      this.selectRefundReasonTrigger,
      'The refund reason selector is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.selectRefundReasonTrigger.click();
    const firstReason = this.page
      .locator(`[data-testid^="${ORDER_DETAILS_DATA_TEST_IDS.refundReasonOptionPrefix}"]`)
      .first();
    await expect(firstReason, 'A refund reason option is not visible').toBeVisible({
      timeout: 40000,
    });
    await firstReason.click();
  }

  async selectPartialOptionOrderAction(amount?: number, isCapture: boolean = false): Promise<void> {
    await expect(
      this.operationTypeTrigger,
      'The operation type selector is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.operationTypeTrigger.click();
    await this.ensureVisibleToClick(
      this.radiobuttonPartial,
      undefined,
      'The partial operation option is not visible'
    );

    if (amount) {
      await this.typeFormattedAmount(this.inputAmountActionOrder, amount, this.languageCode);
    }

    if (!isCapture) {
      await this.selectPartialRefundReason();
    }

    const saveButton = isCapture ? this.buttonSaveCapture : this.buttonSaveRefund;
    await expect(saveButton, 'The save button is not enabled').toBeEnabled({
      timeout: 40000,
    });
    await saveButton.click();
  }

  async showShippingAddress(): Promise<void> {
    await this.openSummaryTab();
    await expect(this.shippingAddressTitle, 'Shipping address card is not visible').toBeVisible();
  }

  async showBillingAddress(): Promise<void> {
    await this.openPaymentTab();
    await expect(this.billingAddressTitle, 'Billing address card is not visible').toBeVisible();
  }

  async assertPaymentStatus(
    status: OrderStatusTypes,
    maxRetries: number = 6,
    retryDelay: number = 3000
  ): Promise<void> {
    console.log(`[INFO] --> Validating payment status '${status}' in admin order details page`);
    await this.openPaymentTab();
    const paymentStatusLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.paymentStatus(status)
    );
    // Reload returns to the Summary tab; re-open Pago so the status chip is in the DOM.
    await retryOperationReloadWithAction(
      this.page,
      paymentStatusLocator,
      maxRetries,
      retryDelay,
      async () => {
        await this.openPaymentTab();
      }
    );
  }

  /**
   * Asserts the order status in the admin order details page.
   * NOTE: This method not validate payment status, only order status.
   * For payment status validation, use assertPaymentStatus method.
   */
  async assertOrderStatus(
    status: OrderStatusTypes,
    maxRetries: number = 6,
    retryDelay: number = 3000
  ): Promise<void> {
    console.log(`[INFO] --> Validating order status '${status}' in admin order details page`);
    const orderStatusLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.orderStatus(status)
    );
    await retryOperation(this.page, orderStatusLocator, maxRetries, retryDelay);
  }

  async assertPaymentHistoryHas3DS(): Promise<void> {
    await this.clickOnPaymentHistoryButton();

    try {
      await expect(
        this.getPaymentHistoryStatus('pending_3ds').first(),
        'The 3DS status is not visible'
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await this.clickOnClosePaymentHistoryDrawer();
    }
  }

  async clickOnClosePaymentHistoryDrawer(): Promise<void> {
    if (!(await this.historyContainer.isVisible().catch(() => false))) {
      return;
    }

    const closeButton = this.historyContainer.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonDrawerPaymentHistoryClose
    );

    if (await closeButton.isVisible().catch(() => false)) {
      try {
        await closeButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
        await closeButton.click({ timeout: 3000 });
      } catch {
        await this.page.keyboard.press('Escape');
      }
    } else {
      await this.page.keyboard.press('Escape');
    }

    await expect(this.historyContainer, 'Drawer did not close').toBeHidden({
      timeout: 10000,
    });
  }

  async assertPaymentHistoryStatus(
    status: OrderStatusTypes,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    console.log(`[INFO] --> Validating that payment history contains status '${status}'`);
    const historyEntryLocator = this.getPaymentHistoryStatus(status).last();
    await this.clickOnPaymentHistoryButton();
    await retryOperationReloadWithAction(
      this.page,
      historyEntryLocator,
      maxRetries,
      retryDelay,
      async () => await this.clickOnPaymentHistoryButton()
    );
    await expect(historyEntryLocator).toBeVisible();

    console.log(`[SUCCESS] --> Payment history contains status '${status}'!`);
    await this.clickOnClosePaymentHistoryDrawer();
  }

  private getPaymentHistoryStatus(status: OrderStatusTypes): Locator {
    return this.paymentHistoryStatusFields.filter({
      hasText: new RegExp(`:\\s*${status}$`, 'i'),
    });
  }

  async assertPaymentHistoryStatusAndProcessorName(
    status: OrderStatusTypes,
    processorName: string,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    console.log(
      `[INFO] --> Validating that payment history contains status '${status}' and processor name '${processorName}'`
    );

    const openDrawer = async () => {
      if (!(await this.historyContainer.isVisible().catch(() => false))) {
        await this.clickOnPaymentHistoryButton();
        await expect(this.historyContainer).toBeVisible();
      }
    };

    const closeDrawer = async () => {
      if (await this.historyContainer.isVisible().catch(() => false)) {
        await this.clickOnClosePaymentHistoryDrawer();
      }
    };

    const checkHistoryEntries = async (): Promise<boolean> => {
      const matchingEvent = this.paymentHistoryEvents
        .filter({ has: this.getPaymentHistoryStatus(status) })
        .filter({
          has: this.paymentHistoryProcessorFields.filter({ hasText: processorName }),
        })
        .first();

      return matchingEvent.isVisible().catch(() => false);
    };

    let found = false;

    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await openDrawer();

        found = await checkHistoryEntries();
        if (found) break;

        console.log(`[INFO] --> Attempt ${attempt + 1}/${maxRetries}: not found, reloading...`);

        await closeDrawer();
        await this.page.reload();
        await expect(this.labelPaymentDetails).toBeVisible({ timeout: 35000 });
        await this.page.waitForTimeout(retryDelay);
      }

      if (!found) {
        throw new Error(
          `Payment history does not contain status '${status}' with processor '${processorName}' after ${maxRetries} attempts`
        );
      }

      console.log(
        `[SUCCESS] --> Payment history contains status '${status}' and processor name '${processorName}'!`
      );
    } finally {
      await closeDrawer();
    }
  }
  async assertExternalTransactionIdCopied(paymentObject: any): Promise<void> {
    const expectedValue = paymentObject.order.payment.data.external_transaction_id;
    const displayedValue = expectedValue === '' ? 'N/A' : expectedValue;

    const containerLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.externalTransactionId(displayedValue)
    );
    const copyButton = containerLocator.locator('button');
    await expect(copyButton).toBeVisible();
    await this.click(copyButton);
    const clipboardValue = await this.page.evaluate(async () => {
      return navigator.clipboard.readText();
    });

    expect(clipboardValue).toBe(displayedValue);
  }

  async assertAuthorizationCode(paymentObject: any): Promise<void> {
    const authCode = paymentObject.order.payment.data.authorization_code;
    const displayedValue = authCode === '' ? 'N/A' : authCode;
    const value = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.authorizationCode(displayedValue)
    );
    await expect(value, `The authorization code "${displayedValue}" is not visible`).toBeVisible();
  }
  async assertOrderItems(orderData: any): Promise<void> {
    const items = orderData.order.items;
    for (const item of items) {
      const itemNameLocator = this.orderItemNameCell(String(item.id));
      await expect(itemNameLocator, `Item name ${item.name} not visible`).toBeVisible();
      await expect(itemNameLocator).toHaveText(item.name);

      const quantityCell = this.orderItemQuantityCell(String(item.id));
      await expect(quantityCell, `Item quantity ${item.quantity} not visible`).toHaveText(
        `${item.quantity}`
      );

      const totalAmountCell = this.orderItemTotalAmountCell(String(item.id));
      await expect(
        totalAmountCell,
        `Item total_amount = ${item.total_amount.display_amount} not visible`
      ).toHaveText(item.total_amount.display_amount);
    }
  }

  async assertPaymentDataBasics(paymentObject: any): Promise<void> {
    await this.assertExternalTransactionIdCopied(paymentObject);
    await this.assertAuthorizationCode(paymentObject);
    await this.assertPaymentMethod(paymentObject.order.payment.data.method_type);
    const originalProcessor = paymentObject.order.payment.data.merchant_payment_processor_name;
    await this.assertProcessorName(originalProcessor);
  }

  async assertActivityRegistry3DSStarted(): Promise<void> {
    const locator = this.activityCheckpoint('tv_three_ds_authentication_initiation_started');
    await expect(locator, 'No se encontró el checkpoint 3DS started en la página').toBeVisible();
  }

  async assertActivityRegistry3DSUpdated(): Promise<void> {
    const continueThreeDs = this.activityCheckpoint('tv_continue_three_ds_called');
    const verifyThreeDs = this.activityCheckpoint('tv_verify_three_ds');
    await expect(
      continueThreeDs.or(verifyThreeDs),
      'No se encontró el checkpoint 3DS updated en la página'
    ).toBeVisible();
  }

  async assertFullOrderData(orderData: any): Promise<void> {
    console.log('orderData', orderData);
    const shipping = orderData.order.shipping_address;
    await this.assertPaymentDataBasics(orderData);
    await this.assertShippingAddressDetails(
      shipping.first_name,
      shipping.phone,
      shipping.identity_document,
      shipping.city,
      shipping.state_name,
      shipping.zipcode,
      shipping.country_code,
      shipping.address1
    );
    await this.assertOrderItems(orderData);

    console.log('[INFO] -> Full order data validated successfully!');
  }

  //This function asserts the activity registry in the order details page in the correct order of appearance
  async assertActivitySequenceInOrder(activityTypes: string[]): Promise<void> {
    let prevTop: number | null = null;

    for (const activityType of activityTypes) {
      const locator = this.activityCheckpoint(activityType);
      await retryOperation(this.page, locator, 3, 4000);
      await expect(locator, `Activity checkpoint "${activityType}" was not found`).toBeVisible();

      const currentTop = await locator.evaluate((el) => el.getBoundingClientRect().top);
      if (prevTop !== null) {
        expect(
          currentTop,
          `Activity "${activityType}" showed before the previous one in the Activity.`
        ).toBeGreaterThan(prevTop);
      }
      prevTop = currentTop;
    }
  }

  async assertActivityTransitionCreatedOrderToPaymentGenerated(): Promise<void> {
    await this.assertActivitySequenceInOrder(['tv_create_order', 'tv_create_payment']);
  }

  async assertActivityTransitionCreatedOrderToPartialRefund(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_order',
      'tv_create_payment',
      'tv_partial_request_refund',
    ]);
  }

  async assertActivityTransitionCreatedOrderToPaymentAuthorized(): Promise<void> {
    await this.assertActivitySequenceInOrder(['tv_create_order', 'tv_create_authorization']);
  }

  async assertActivityTransitionCreatedOrderToPaymentCaptured(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_order',
      'tv_create_authorization',
      'tv_update_order',
      'tv_request_capture',
    ]);
  }

  async assertActivityTransitionCreatedOrderToPaymentVoided(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_order',
      'tv_create_authorization',
      'tv_update_order',
      'tv_request_void',
    ]);
  }

  async assertActivityTransitionAuthCapturePartialRefund(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_authorization',
      'tv_request_capture',
      'tv_partial_request_refund',
    ]);
  }

  async assertActivityTransitionAuthCapture(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_authorization',
      'tv_update_order',
      'tv_request_capture',
    ]);
  }

  async assertActivityTransitionAuthPartialCapture(): Promise<void> {
    await this.assertActivitySequenceInOrder([
      'tv_create_order',
      'tv_create_authorization',
      'tv_partial_request_capture',
    ]);
  }

  async assertPaymentStatusTransition(
    fromStatus: OrderStatusTypes,
    toStatus: OrderStatusTypes,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    await this.assertPaymentHistoryStatus(fromStatus, maxRetries, retryDelay);
    const historyEntryLocator = this.getPaymentHistoryStatus(toStatus).last();
    await retryOperationReloadWithAction(
      this.page,
      historyEntryLocator,
      maxRetries,
      retryDelay,
      async () => await this.clickOnPaymentHistoryButton()
    );
    console.log(
      `[SUCCESS] --> Payment history shows transaction from '${fromStatus}' to '${toStatus}'!`
    );
    await this.clickOnClosePaymentHistoryDrawer();
  }

  async assertProcessorName(processor: string | ConnectionsAvailable): Promise<void> {
    const finalProcessor = this.normalizeProcessorName(processor);
    console.log(`[INFO] --> Validating processor name: ${finalProcessor}`);
    await this.openPaymentTab();
    await this.validateProcessorVisibility(finalProcessor);
  }

  private normalizeProcessorName(processor: string | ConnectionsAvailable): string {
    if (typeof processor !== 'string') {
      return processor;
    }
    const processorKey = this.convertToCamelCase(processor);
    return this.lookupEnumValue(processorKey) ?? processor;
  }

  private convertToCamelCase(input: string): string {
    return input.includes('_') ? input.replace(/(_.)/g, (match) => match[1].toUpperCase()) : input;
  }

  private lookupEnumValue(key: string): string | undefined {
    return key in ConnectionsAvailable
      ? ConnectionsAvailable[key as keyof typeof ConnectionsAvailable]
      : undefined;
  }

  async validateProcessorVisibility(
    processorName: string,
    isUnderscore: boolean = false
  ): Promise<void> {
    const apiKey = isUnderscore
      ? processorName.toLowerCase().replace(/[\s-]+/g, '_')
      : processorName.toLowerCase().replace(/\s+/g, '-');
    const underscoreKey = processorName.toLowerCase().replace(/[\s-]+/g, '_');
    // admin-ff slugifyForDataTestIdSegment: non-alphanumerics (including `_`) become `-`
    const hyphenSlug = slugifyForDataTestIdSegment(processorName);
    const lowerLocator = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.processor(apiKey));
    const underscoreLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.processor(underscoreKey)
    );
    const hyphenLocator = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.processor(hyphenSlug));
    const exactLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.processor(processorName)
    );
    const nameLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.processorName(processorName)
    );
    const processorLocator = lowerLocator
      .or(underscoreLocator)
      .or(hyphenLocator)
      .or(exactLocator)
      .or(nameLocator)
      .first();
    await expect(
      processorLocator,
      `The processor "${processorName}" is not visible or incorrect (tried '${apiKey}', '${underscoreKey}', '${hyphenSlug}' and '${processorName}')`
    ).toBeVisible();
  }

  async assertCustomerDataIsCorrect(customerName: string, customerLastName: string): Promise<void> {
    await this.openSummaryTab();
    await expect(this.customerCard, 'Customer details card is not visible').toBeVisible();
    await expect(this.customerFirstNameField).toContainText(customerName);
    await expect(this.customerLastNameField).toContainText(customerLastName);
  }

  async assertRoutingStrategy(strategy: string): Promise<void> {
    const routingStrategyLocator = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.routingStrategy(strategy)
    );
    await expect(routingStrategyLocator, strategy).toBeVisible();
  }

  async assertSplitTrackingPathName(pathNames: string[]): Promise<void> {
    await this.openPaymentTab();
    const pathLocators = pathNames.map((pathName) =>
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.splitTrackingPathName(pathName))
    );
    const anyPathLocator = pathLocators.reduce((combined, locator) => combined.or(locator));

    await expect(
      anyPathLocator,
      `None of the configured split path names (${pathNames.join(', ')}) is visible in Order Detail`
    ).toBeVisible();
  }

  async assertNumberOfInstallments(installments: number): Promise<void> {
    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.installmentDues),
      `The number of installments ${installments} is not visible`
    ).toContainText(`${installments}`);
  }

  async assertTypeInstallments(typeInstallment: 'MSI' | 'MCI'): Promise<void> {
    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.installmentType),
      `The type of installments ${typeInstallment} is not visible`
    ).toContainText(typeInstallment);
  }

  async assertPaymentMethod(
    paymentMethod:
      | 'debit'
      | 'credit'
      | 'debit_card'
      | 'bnpl'
      | 'credit_card'
      | 'voucher'
      | 'wallet'
      | 'bank_transfer'
  ): Promise<void> {
    await this.openPaymentTab();
    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.paymentMethodDetails),
      `The payment method ${paymentMethod} is not visible`
    ).toContainText(paymentMethod, { ignoreCase: true });
  }

  async assertPaymentHistoryButtonIsVisible(): Promise<void> {
    await expect(this.historyList).toBeVisible();
  }

  /**
   * Asserts the fraud processor name on the admin order details page.
   * This function will attempt to locate and validate the specified fraud processor name
   * within the admin order details page. If the validation fails, it will retry the operation
   * up to the specified number of retries, with a delay between each retry.
   *
   * @param {ConnectionsAvailable} processorName - The name of the fraud processor to validate.
   * @param {number} [maxRetries=3] - The maximum number of retry attempts if the validation fails. Default is 3.
   * @param {number} [retryDelay=4000] - The delay between retry attempts in milliseconds. Default is 4000 milliseconds.
   * @returns {Promise<void>} - A promise that resolves when the validation is complete.
   *
   * @example
   * // Validate the fraud processor name 'ProcessorName' with up to 5 retries and a delay of 3000 milliseconds between retries.
   * await assertFraudProcessor('ProcessorName', 5, 3000);
   *
   * @remarks
   * This function uses the Playwright library to interact with the web page and perform the validation.
   * It logs an informational message indicating the start of the validation process.
   * It locates the antifraud risk processor container by testid and retries the operation until visible.
   */
  async assertFraudProcessor(
    processorName: ConnectionsAvailable,
    maxRetries: number = 3,
    retryDelay: number = 4000
  ): Promise<void> {
    console.log(
      `[INFO] --> Validating fraud processor name '${processorName}' in admin order details page`
    );
    await this.tabSecurity.click();
    const fraudProcessorLocator = this.page
      .getByTestId(ORDER_DETAILS_DATA_TEST_IDS.antifraudRiskProcessor)
      .filter({ hasText: new RegExp(processorName, 'i') });
    await retryOperation(this.page, fraudProcessorLocator, maxRetries, retryDelay);
  }

  /**
   * Asserts the fraud risk level on the admin order details page.
   * This function will attempt to locate and validate the specified fraud risk level
   * within the admin order details page. If the validation fails, it will retry the operation
   * up to the specified number of retries, with a delay between each retry.
   *
   * @param {RiskLevel} risk - The risk level to validate. This should be one of the predefined risk levels.
   * @param {number} [maxRetries=3] - The maximum number of retry attempts if the validation fails. Default is 3.
   * @param {number} [retryDelay=5000] - The delay between retry attempts in milliseconds. Default is 5000 milliseconds.
   * @returns {Promise<void>} - A promise that resolves when the validation is complete.
   *
   * @example
   * // Validate the fraud risk level 'High' with up to 5 retries and a delay of 3000 milliseconds between retries.
   * await assertFraudRisk('High', 5, 3000);
   *
   * @remarks
   * This function uses the Playwright library to interact with the web page and perform the validation.
   * It logs an informational message indicating the start of the validation process.
   * It locates the div element containing the text specified by `this.selectors.screenOrderDetails.labelFraudIdentification`.
   * Within the located div, it further locates the p element that exactly matches the risk level.
   * It then calls the `retryOperation` function with the located p element, maxRetries, and retryDelay to perform the validation with retries.
   */
  async assertFraudRisk(
    risk: RiskLevel,
    maxRetries: number = 3,
    retryDelay: number = 5000
  ): Promise<void> {
    const riskStatus = this.selectors.fraudStatusSelectors[risk];
    console.log(`[INFO] --> Validating risk level '${riskStatus}' in admin order details page`);
    const divFraudRiskLocator = this.page.locator(
      `div:has-text("${this.selectors.screenOrderDetails.labelFraudIdentification}")`
    );
    const fraudRiskLocator = divFraudRiskLocator
      .locator(`//span[normalize-space(.)="${riskStatus}"]`)
      .first();
    await retryOperation(this.page, fraudRiskLocator, maxRetries, retryDelay);
  }

  async assertOrderFromCardInstallmentRateAndAmount(
    currency: string,
    installmentAmount: number,
    installmentRate: number
  ) {
    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.installmentAmount),
      `The installment amount ${currency} ${installmentAmount} is not visible`
    ).toContainText(`${currency} ${installmentAmount}`);

    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.installmentInterest),
      `The installment rate ${installmentRate}% is not visible`
    ).toContainText(`${installmentRate}%`);
  }

  async assertFraudAnalysisIsNotEmpty(privateKey: string, orderToken: string) {
    await this.page.waitForTimeout(2000);
    const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    const fraudResponse = paymentData.bodyResponse?.order?.fraud?.analysis;

    console.log(`The fraud decision is: ${JSON.stringify(fraudResponse)}`);
    // Validate that the response object is not empty
    expect(
      Object.keys(fraudResponse).length,
      'The response object should not be empty'
    ).toBeGreaterThan(0);

    // Validate each field individually
    expect(fraudResponse.score, 'The "score" field should not be empty').not.toBeNull();
    expect(fraudResponse.processor, 'The "processor" field should not be empty').not.toBe('');
    expect(fraudResponse.risk_level, 'The "risk_level" field should not be empty').not.toBe('');
    expect(fraudResponse.status, 'The "status" field should not be empty').not.toBe('');
    expect(fraudResponse.fraud_decision, 'The "fraud_decision" field should not be empty').not.toBe(
      ''
    );
    expect(fraudResponse.details, 'The "details" field should not be empty').not.toBe('');
    expect(
      fraudResponse.processor_response,
      'The "processor_response" field should not be empty'
    ).not.toBe('');
  }

  async assertFraudNull(privateKey: string, orderToken: string) {
    await this.page.waitForTimeout(2000);
    const { bodyResponse } = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    expect(bodyResponse.order.fraud).toBeNull();
  }

  async assertFraudAnalysisData(
    risk_level: string,
    fraud_decision: string,
    status: string,
    processor: string,
    privateKey: string,
    orderToken: string
  ) {
    await this.page.waitForTimeout(2000);
    const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    const fraud = paymentData.bodyResponse?.order?.fraud;
    const fraudAnalysis = paymentData.bodyResponse?.order?.fraud?.analysis;

    if (risk_level !== '') {
      expect(fraudAnalysis.risk_level).toBe(risk_level);
    }

    expect(fraudAnalysis.fraud_decision).toBe(fraud_decision);
    expect(fraud.status).toBe(status);

    if (processor !== '') {
      expect(fraudAnalysis.processor).toBe(processor);
    }
  }

  async assertFraudShadowAnalysisData(
    index: number,
    risk_level: string,
    fraud_decision: string,
    status: string,
    processor: string,
    privateKey: string,
    orderToken: string
  ) {
    const paymentData = await retryUntil(
      () => apiCallNewman.getOrderPaymentStatus(privateKey, orderToken),
      (response) => Boolean(response.bodyResponse?.order?.fraud_shadowmode?.[index]?.analysis),
      10,
      3000,
      (delay) => this.page.waitForTimeout(delay)
    );
    const fraudShadowResponse = paymentData.bodyResponse?.order?.fraud_shadowmode;

    expect(fraudShadowResponse[index]).toBeDefined();
    if (risk_level !== '') {
      expect(fraudShadowResponse[index].analysis.risk_level).toBe(risk_level);
    }

    expect(fraudShadowResponse[index].analysis.fraud_decision).toBe(fraud_decision);
    expect(fraudShadowResponse[index].analysis.status).toBe(status);

    if (processor !== '') {
      expect(fraudShadowResponse[index].analysis.processor).toBe(processor);
    }
  }

  async assertRouting(processor: string) {
    await this.openPaymentTab();
    await expect(
      this.page.getByTestId(
        ORDER_DETAILS_DATA_TEST_IDS.processor(slugifyForDataTestIdSegment(processor))
      )
    ).toBeVisible();
  }

  async assertAirlineInformation(
    expectedAirlineInfo: any,
    privateKey: string,
    orderToken: string
  ): Promise<void> {
    await this.openSummaryTab();
    await expect(this.buttonExpandDetails).toBeVisible();
    await this.buttonExpandDetails.click();

    const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
    expect(orderData.airlineInformation).not.toBeUndefined();
    const airlineInformation = orderData.airlineInformation;
    expect(airlineInformation).toEqual(expectedAirlineInfo);
  }

  private async _assertGenericAddressDetails(
    cardName: string,
    addressType: 'shipping' | 'billing',
    expectedName: string,
    expectedPhone: string,
    expectedDNI: string,
    expectedCity: string,
    expectedState: string,
    expectedPostalCode: string,
    expectedCountry: string,
    expectedAddress1: string
  ): Promise<void> {
    if (addressType === 'billing') {
      await this.showBillingAddress();
    } else {
      await this.showShippingAddress();
    }
    await expect(
      this.addressDetailField(addressType, 'firstName'),
      `${cardName} name "${expectedName}" not visible`
    ).toContainText(expectedName);
    await expect(
      this.addressDetailField(addressType, 'phone'),
      `${cardName} phone "${expectedPhone}" not visible`
    ).toContainText(expectedPhone);
    await expect(
      this.addressDetailField(addressType, 'identityDocument'),
      `${cardName} dni "${expectedDNI}" not visible`
    ).toContainText(expectedDNI);
    await expect(
      this.addressDetailField(addressType, 'city'),
      `${cardName} city "${expectedCity}" not visible`
    ).toContainText(expectedCity);
    await expect(
      this.addressDetailField(addressType, 'stateName'),
      `${cardName} state "${expectedState}" not visible`
    ).toContainText(expectedState);
    await expect(
      this.addressDetailField(addressType, 'zipcode'),
      `${cardName} postal code "${expectedPostalCode}" not visible`
    ).toContainText(expectedPostalCode);
    await expect(
      this.addressDetailField(addressType, 'countryCode'),
      `${cardName} country "${expectedCountry}" not visible`
    ).toContainText(expectedCountry);
    await expect(
      this.addressDetailField(addressType, 'address1'),
      `${cardName} address 1 "${expectedAddress1}" not visible`
    ).toContainText(expectedAddress1);
  }

  async assertShippingAddressDetails(
    expectedName: string,
    expectedPhone: string,
    expectedDNI: string,
    expectedCity: string,
    expectedState: string,
    expectedPostalCode: string,
    expectedCountry: string,
    expectedAddress1: string
  ): Promise<void> {
    await this._assertGenericAddressDetails(
      'Shipping Address',
      'shipping',
      expectedName,
      expectedPhone,
      expectedDNI,
      expectedCity,
      expectedState,
      expectedPostalCode,
      expectedCountry,
      expectedAddress1
    );
  }

  async assertBillingAddressDetails(
    expectedName: string,
    expectedPhone: string,
    expectedDNI: string,
    expectedCity: string,
    expectedState: string,
    expectedPostalCode: string,
    expectedCountry: string,
    expectedAddress1: string
  ): Promise<void> {
    await this._assertGenericAddressDetails(
      'Billing Address',
      'billing',
      expectedName,
      expectedPhone,
      expectedDNI,
      expectedCity,
      expectedState,
      expectedPostalCode,
      expectedCountry,
      expectedAddress1
    );
  }
  async validateShadowMode(fraudProcessor: ConnectionsAvailable) {
    await this.tabSecurity.click();
    await expect(
      this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.shadowModeRiskProcessor)
    ).toContainText(fraudProcessor.replace(/-/g, ' '), { ignoreCase: true });
  }

  async clickOnViewMetadataLink(): Promise<void> {
    await this.openSummaryTab();
    await expect(this.linkViewMetadata, 'The view metadata link is not visible').toBeVisible();
    await this.linkViewMetadata.click();
  }

  async assertMetadataDrawerIsVisible(): Promise<void> {
    await expect(this.drawerMetadata, 'The metadata drawer is not visible').toBeVisible();
  }

  async assertMetadataContainsKey(key: string): Promise<void> {
    const keyLocator = this.page.locator(`text='"${key}"'`).first();
    await expect(keyLocator, `Metadata key "${key}" is not present in the page`).toBeAttached();
  }

  async assertMetadataContainsValue(value: string): Promise<void> {
    const isStringValue = isNaN(Number(value)) && value !== 'true' && value !== 'false';
    const searchValue = isStringValue ? `"${value}"` : value;
    const valueLocator = this.page.locator(`text='${searchValue}'`).first();
    await expect(
      valueLocator,
      `Metadata value "${value}" is not present in the page`
    ).toBeAttached();
  }

  async assertMetadataContent(expectedMetadata: Record<string, any>): Promise<void> {
    await this.assertMetadataDrawerIsVisible();

    const validateMetadataRecursively = async (obj: Record<string, any>): Promise<void> => {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          continue;
        }

        await this.assertMetadataContainsKey(key);

        if (value instanceof Date) {
          await this.assertMetadataContainsValue(value.toISOString());
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          await validateMetadataRecursively(value);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
              await this.assertMetadataContainsValue(String(item));
            } else if (typeof item === 'object' && item !== null) {
              await validateMetadataRecursively(item);
            }
          }
        } else {
          await this.assertMetadataContainsValue(String(value));
        }
      }
    };

    await validateMetadataRecursively(expectedMetadata);
  }
  async assertProcessorLogo(processor: string) {
    const apiKey = slugifyForDataTestIdSegment(processor);
    const container = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.processor(apiKey));
    await expect(
      container.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.ssotImage(processor)),
      `The processor logo for "${processor}" is not visible`
    ).toBeVisible();
  }
}
