import { expect } from '@playwright/test';

import { FrameworkPlugin } from '../interface';
import { resolveOrderToken } from '../../resolve';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import {
  BaseCreditCard,
  FillCardFormOptions,
} from '@support/interfaces/credit_cards/baseCreditCard';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { OrderStatusTypes } from '@support/interfaces/orderStatusTypes';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';

type CardFormInteraction = 'fill' | 'press';

/** Any request to the subscriptions listing, whatever the environment host. */
const SUBSCRIPTIONS_URL_PATTERN = /\/subscriptions\?/;

/** Why a card's delete control is withheld, as rendered by the widget's tooltip. */
type DeletionBlockedReason = 'blocked' | 'unverified';

export interface CardByNumberParams {
  cardNumber: string;
}

export interface AssertSelectedDeletionBlockedParams {
  reason: DeletionBlockedReason;
}

export interface StubSubscriptionLookupsParams {
  subscribedCardId?: string;
  failingCardId?: string;
}

export interface SelectSavedCardParams {
  cardNumber: string;
}

export interface FillFormVaultParams {
  creditCardData: BaseCreditCard;
  opts?: { avoidInstallmentsCall?: boolean; type?: CardFormInteraction; country?: string };
}

export interface SelectInstallmentsMSIParams {
  installments: InstallmentQuantity;
  customInstallmentLabel?: string;
}

export interface ClickOnPayParams {
  purchaseV1?: boolean;
  withSuccessAssertion?: boolean;
}

export interface EnterOtpCodeParams {
  code?: string;
}

export interface FillCvvInCardFormParams {
  cvv: string;
  type?: CardFormInteraction;
  avoidInstallmentsCall?: boolean;
}

export interface FillNameBillingFormParams {
  name: string;
}

export interface AssertOrderStatusPurchaseV2Params {
  status: OrderStatusTypes;
  statusCode: number;
  /** Use the cardId captured by the most recent assertCardRequest call. */
  useStoredCardId?: boolean;
}

export interface AssertPurchaseSendProperPlanOptionIdParams {
  installments: InstallmentQuantity;
}

export interface AssertTransactionPaymentStatusParams {
  status: OrderStatusTypes;
  privateKey?: string;
  orderToken?: string;
}

export interface AssertTextVisibleInIframeParams {
  text: string;
  matchFirst?: boolean;
}

export interface AssertSavedCardIsVisibleParams {
  expectedCardNumbers: string;
}

export interface FillCardFormParams {
  creditCardData: BaseCreditCard;
  options?: FillCardFormOptions;
}

export interface AssertEventWasFiredParams {
  event: string;
}

export class PluginCheckoutVault extends FrameworkPlugin {
  pluginBaseName = 'checkout.vault';

  private _pageObject?: VaultWidgetPage;
  private lastCardId: string | undefined;
  private globalAssert = new GlobalAssert();

  get pageObject(): VaultWidgetPage {
    if (!this._pageObject) {
      this._pageObject = new VaultWidgetPage(this.context.page);
    }
    return this._pageObject;
  }

  /** @description Selects a saved card from the vault widget by matching on the last four digits of the provided card number. */
  async $tf_selectSavedCard({ cardNumber }: SelectSavedCardParams) {
    await this.pageObject.clickOnTestCard(cardNumber);
  }

  /**
   * @description Puts each card's subscriptions lookup in the state the test needs: subscribed,
   * failing, or free of subscriptions. Install it before checkout.openCheckout — the widget
   * queries as soon as the saved cards load — and assert on the UI, not on the response.
   */
  async $tf_stubSubscriptionLookups({
    subscribedCardId,
    failingCardId,
  }: StubSubscriptionLookupsParams) {
    await this.context.page.route(SUBSCRIPTIONS_URL_PATTERN, async (route) => {
      const cardId = new URL(route.request().url()).searchParams.get('card_id');

      if (cardId === failingCardId) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }

      const subscriptions = cardId === subscribedCardId ? [{ id: 'stub', card_id: cardId }] : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: subscriptions }),
      });
    });
  }

  /** Explains why a delete control is withheld; keyed by reason, not by card. */
  private cardDeletionTooltip(reason: DeletionBlockedReason) {
    return this.pageObject.iframeVault.getByTestId(`card-deletion-tooltip-${reason}`);
  }

  /** @description Sets a saved card as the default one from its actions menu. Cards start without a default, so a test that needs one has to establish it. */
  async $tf_setCardAsDefault({ cardNumber }: CardByNumberParams) {
    const lastFour = cardNumber.slice(-4);

    await this.pageObject.openCardActionsByLastFour(lastFour);
    await this.pageObject.buttonSetCardAsDefault(lastFour).click();
  }

  /** @description Deletes a saved card from the list: opens its actions menu, chooses Eliminar and confirms the modal. */
  async $tf_deleteCard({ cardNumber }: CardByNumberParams) {
    await this.pageObject.openCardActionsByLastFour(cardNumber.slice(-4));
    await this.pageObject.buttonCardDeleteOption(cardNumber.slice(-4)).click();
    await this.pageObject.confirmDeleteCard();
  }

  /** @description Deletes the card shown in the single-card view, through its kebab and the confirmation modal. */
  async $tf_deleteSelectedCard() {
    await this.pageObject.deleteSelectedCard();
  }

  /** @description Asserts the card offers no actions at all: it is already the default one and its deletion is withheld, so no kebab is rendered. */
  async $tf_assertCardHasNoActions({ cardNumber }: CardByNumberParams) {
    await expect(this.pageObject.buttonCardActionsTrigger(cardNumber.slice(-4))).toBeHidden();
  }

  /** @description Opens the card actions menu and asserts the Eliminar entry is not offered, while the menu itself stays usable. */
  async $tf_assertDeleteOptionNotOffered({ cardNumber }: CardByNumberParams) {
    const panel = this.pageObject.cardActionsPanel(cardNumber.slice(-4));

    await this.pageObject.openCardActionsByLastFour(cardNumber.slice(-4));
    await expect(panel).toBeVisible();
    await expect(this.pageObject.buttonCardDeleteOption(cardNumber.slice(-4))).toBeHidden();

    // Leave the menu closed: with it open, the next click on another card's
    // kebab would be spent dismissing this one.
    await this.context.page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  }

  /** @description Asserts the single-card view offers its delete button enabled, which is the behaviour when the merchant has not restricted deletion. */
  async $tf_assertSelectedCardDeletionOffered() {
    await this.pageObject.triggerRemoveSelectedCard.click();
    await expect(this.pageObject.buttonRemoveSelectedCard).toBeEnabled();
  }

  /** @description Asserts the single-card view offers its delete button disabled, with the tooltip explaining why deletion is withheld. */
  async $tf_assertSelectedCardDeletionBlocked({ reason }: AssertSelectedDeletionBlockedParams) {
    await this.pageObject.triggerRemoveSelectedCard.click();
    await expect(this.pageObject.buttonRemoveSelectedCard).toBeDisabled();
    await expect(this.cardDeletionTooltip(reason)).toBeVisible();
  }

  /** @description Asserts that the vault widget main view title is visible, confirming that the vault widget has mounted and is showing the saved-cards screen. */
  async $tf_assertVaultVisible() {
    await this.pageObject.assertTitleVisibleInMainView();
  }

  /** @description Asserts that the terms and conditions plus privacy policy section is visible in the vault widget. */
  async $tf_assertUserSeeTermsAndConditions() {
    await this.pageObject.assertUserSeeTermsAndConditions();
  }

  /** @description Fills the vault widget card form with the given card. opts.type=press uses pressSequentially for fields; opts.country resolves the default document number for the country. */
  async $tf_fillFormVault({ creditCardData, opts }: FillFormVaultParams) {
    await this.pageObject.fillFormVault(creditCardData, opts);
  }

  /** @description Fills the CVV input in the vault widget card form. Use type=press for pressSequentially. Pass avoidInstallmentsCall=true to skip waiting for the installments response. */
  async $tf_fillCvvInCardForm({
    cvv,
    type = 'fill',
    avoidInstallmentsCall = false,
  }: FillCvvInCardFormParams) {
    await this.pageObject.fillCvvInCardForm(cvv, type, avoidInstallmentsCall);
  }

  /** @description Selects the given MSI (meses sin intereses) installments option in the vault widget installments dropdown. */
  async $tf_selectInstallmentsMSI({
    installments,
    customInstallmentLabel,
  }: SelectInstallmentsMSIParams) {
    await this.pageObject.selectInstallmentsMSI(installments, customInstallmentLabel);
  }

  /** @description Asserts that the pay/save button is visible and enabled in the vault widget. */
  async $tf_assertButtonEnabled() {
    await this.pageObject.assertButtonEnabled();
  }

  /** @description Clicks the pay button in the vault widget. Sets up purchase V1 or V2 request/response listeners; optionally waits for the vaultSaveSuccess event. */
  async $tf_clickOnPay({
    purchaseV1 = false,
    withSuccessAssertion = false,
  }: ClickOnPayParams = {}) {
    await this.pageObject.clickOnPay({ purchaseV1, withSuccessAssertion });
  }

  /** @description Clicks the save button in the vault widget to persist the card without completing the purchase. */
  async $tf_clickOnSave() {
    await this.pageObject.clickOnSave();
  }

  /** @description Enters the OTP code in the vault widget OTP input. Defaults to 010101 if no code is provided. */
  async $tf_enterOtpCode({ code = '010101' }: EnterOtpCodeParams = {}) {
    await this.pageObject.enterOtpCode(code);
  }

  /** @description Clicks the continue-as-guest button to leave the authenticated flow after an OTP rejection. */
  async $tf_clickOnContinueAsGuest() {
    await this.pageObject.clickOnContinueAsGuest();
  }

  /** @description Clicks the resend OTP code button to receive a new OTP through the selected channel. */
  async $tf_resendOtpCodeToChannel() {
    await this.pageObject.resendOtpCodeToChannel();
  }

  /** @description Clicks the change-channel button on the OTP screen of the vault widget (e.g. switch SMS to email). */
  async $tf_clickOnChangeChannelButton() {
    await this.pageObject.clickOnChangeChannelButton();
  }

  /** @description Clicks the see-more-cards button in the vault widget to display the full list of saved cards. */
  async $tf_seeMoreCards() {
    await this.pageObject.seeMoreCards();
  }

  /** @description Opens the billing form drawer/iframe in the vault widget. */
  async $tf_showBillingFormIFrame() {
    await this.pageObject.showBillingFormIFrame();
  }

  /** @description Navigates from a sub-screen (e.g. billing form) back to the main card form in the vault widget. */
  async $tf_backToCardForm() {
    await this.pageObject.backToCardForm();
  }

  /** @description Fills the first name input in the vault widget billing form. */
  async $tf_fillNameBillingForm({ name }: FillNameBillingFormParams) {
    await this.pageObject.fillNameBillingForm(name);
  }

  /** @description Clicks the save button in the vault widget billing form. */
  async $tf_clickSaveBillingForm() {
    await this.pageObject.clickSaveBillingForm();
  }

  /** @description Asserts that the POST /cards request returned 201 and stores the returned card_id for use by subsequent assertions. */
  async $tf_assertCardRequest() {
    this.lastCardId = await this.pageObject.assertCardRequest();
  }

  /** @description Asserts that the purchase V2 request payload contains the installment object. */
  async $tf_assertPurchaseSendInstallmentObject() {
    await this.pageObject.assertPurchaseSendInstallmentObject();
  }

  /** @description Asserts that the purchase V2 request sent the plan_option_id matching the selected installments. */
  async $tf_assertPurchaseSendProperPlanOptionId({
    installments,
  }: AssertPurchaseSendProperPlanOptionIdParams) {
    await this.pageObject.assertPurchaseSendProperPlanOptionId(installments);
  }

  /** @description Asserts the purchase V2 response status and that the order status matches expected. When useStoredCardId is true, also asserts the request payload references the card_id captured by the most recent assertCardRequest call. */
  async $tf_assertOrderStatusRequestPurchaseV2({
    status,
    statusCode,
    useStoredCardId = false,
  }: AssertOrderStatusPurchaseV2Params) {
    const cardId = useStoredCardId ? this.lastCardId : undefined;
    await this.pageObject.assertOrderStatusRequestPurchaseV2(status, statusCode, cardId);
  }

  /** @description Asserts the global transaction payment status via the order details API. Uses the given privateKey or falls back to the merchant stored in the test context. */
  async $tf_assertTransactionPaymentStatus({
    status,
    privateKey,
    orderToken,
  }: AssertTransactionPaymentStatusParams) {
    const resolvedPrivateKey = privateKey ?? this.context.merchant?.privateKey;
    if (!resolvedPrivateKey) {
      throw new Error(
        'assertTransactionPaymentStatus: privateKey is required — pass it in params or run a setup.merchant action first'
      );
    }
    await this.globalAssert.assertTransactionPaymentStatus(
      status,
      resolvedPrivateKey,
      resolveOrderToken(this.context, 'checkout.vault.assertTransactionPaymentStatus', orderToken)
    );
  }

  /** @description Asserts that an element with the given visible text is present inside the vault widget iframe. Uses the first match by default. */
  async $tf_assertTextVisibleInIframe({
    text,
    matchFirst = true,
  }: AssertTextVisibleInIframeParams) {
    const base = this.context.page.getByText(text);
    const locator = matchFirst ? base.first() : base;
    await this.pageObject.assertElementVisibleInIframe(locator);
  }

  /** @description Asserts that the saved card with the expected last four digits is visible in the vault widget. */
  async $tf_assertSavedCardIsVisible({ expectedCardNumbers }: AssertSavedCardIsVisibleParams) {
    await this.pageObject.assertSavedCardIsVisible(expectedCardNumbers);
  }

  /** @description Fills the card form in the vault widget with the given card data and options (e.g. country, avoidInstallmentsCall). */
  async $tf_fillCardForm({ creditCardData, options }: FillCardFormParams) {
    await this.pageObject.fillCardForm(creditCardData, options);
  }

  /** @description Asserts that the specified event (e.g. vaultSaveSuccess) has been fired by the vault widget. */
  async $tf_assertEventWasFired({ event }: AssertEventWasFiredParams) {
    await this.pageObject.assertEventWasFired(event);
  }
}
