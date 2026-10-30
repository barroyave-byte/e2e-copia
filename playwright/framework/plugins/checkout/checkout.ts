import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FrameworkPlugin } from '../interface';
import { lookup, resolveOrderToken, resolvePrivateKey, resolvePublicKey } from '../../resolve';
import { ExperienceTypesExplore } from '@support/interfaces/experienceTypesExplore';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FraudProvidersObject } from '@pages/explore/fraud_providers/interfaces';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { ModalExperienceTypePage } from '@pages/explore/modalExperienceTypePage';

export interface OpenCheckoutParams {
  experienceType: ExperienceTypesExplore;
  cssFile?: string;
  language?: LanguageCodes;
  vaultWebSdkConfig?: { withInitNextAction?: boolean };
  antiFraudProviders?: FraudProvidersObject;
  /** Defaults to the merchant from a previous setup.merchant action. */
  publicKey?: string;
  /** Defaults to the merchant from a previous setup.merchant action. */
  privateKey?: string;
  /** Defaults to the order from a previous setup.order action. */
  orderToken?: string;
  /** Defaults to the authenticated user token saved by an earlier step. */
  userToken?: string;
}

export class PluginCheckout extends FrameworkPlugin {
  pluginBaseName = 'checkout';

  /** @description Navigates to the Explore page and opens the requested experience. Pass vaultWebSdkConfig.withInitNextAction=true for Vault (Web SDK) flows that need to transition to the Next Action widget after purchase (e.g. 3DS). Pass antiFraudProviders to enable fraud providers in the explore sidebar (e.g. { MERCADOPAGO: {} }). publicKey, privateKey, orderToken and userToken are resolved from a previous setup.merchant / setup.order action when omitted; pass them (or ref()) to make the dependency explicit. */
  async $tf_openCheckout({
    experienceType,
    cssFile,
    language,
    vaultWebSdkConfig,
    antiFraudProviders,
    publicKey,
    privateKey,
    orderToken,
    userToken,
  }: OpenCheckoutParams) {
    const page = this.context.page;
    const testingTool = nagivateAndConfigureWidget(page, experienceType);

    // The merchant keys have no fallback left either: they used to come from
    // PUBLIC_KEY_MERCHANT / PRIVATE_KEY_MERCHANT, so the widget opened on whichever merchant
    // the worker set up last. Fail naming the action instead.
    const resolvedPublicKey = resolvePublicKey(this.context, 'checkout.openCheckout', publicKey);
    const resolvedPrivateKey = resolvePrivateKey(this.context, 'checkout.openCheckout', privateKey);
    const resolvedUserToken = lookup(this.context, 'userToken', userToken);
    // The order token has no fallback left, and opening the checkout without one used to mean
    // opening it on whatever order the worker tokenized last. Fail with the action named
    // instead. A flow that needs no order is `checkout.openCheckoutWidgetFromCatalog`.
    const resolvedOrderToken = resolveOrderToken(this.context, 'checkout.openCheckout', orderToken);

    await testingTool.navigateAndSetup({
      ...(cssFile ? { customStyle: { cssFile } } : {}),
      ...(language ? { language } : {}),
      ...(vaultWebSdkConfig ? { vaultWebSdkConfig } : {}),
      ...(antiFraudProviders ? { antiFraudProviders } : {}),
      merchantCredentials: { publicKey: resolvedPublicKey, privateKey: resolvedPrivateKey },
      orderToken: resolvedOrderToken,
      ...(resolvedUserToken ? { userToken: resolvedUserToken } : {}),
    });
  }

  async $tf_openCheckoutWidgetFromCatalog(
    params: { publicKey?: string; privateKey?: string } = {}
  ) {
    '@description: Opens Explore\'s simulated storefront (no order token needed), adds a product to the cart, selects "Checkout en Pasos" from the cart modal, lands on Explore\'s own native "Prepara tu envío" form, clicks its Continuar button (data-testid=continue-button, always enabled -- it is not gated by that native form\'s own fields) to open the second "Selecciona el tipo de experiencia" modal, then selects "Checkout Widget" there. Lands on the real checkout-base widget email gate (iframe.zoid-visible) -- follow with checkout.email.enterEmailAndContinue, then checkout.userData.fillGuestUserData, to reach the guest "Datos"/"Envío" step flow. Use this instead of checkout.openCheckout when the test needs a fresh guest DEUNA_CHECKOUT order created purely through the UI: checkout.openCheckout assumes an order/cart context already exists and will hang waiting for #finalize_purchase_button on a bare catalog page. Do NOT use ecommercePage.fillUserEmail/clickOnCheckoutByStepsContinueButton -- fillUserEmail/that second button belong to Explore\'s own native form and its in-iframe counterpart, neither is part of the @deuna/shipping-address pattern.';
    const action = 'checkout.openCheckoutWidgetFromCatalog';
    const page = this.context.page;
    const testingTool = nagivateAndConfigureWidget(page, 'Checkout en Pasos');
    await testingTool.setUpExplore({
      orderToken: '',
      merchantCredentials: {
        publicKey: resolvePublicKey(this.context, action, params.publicKey),
        privateKey: resolvePrivateKey(this.context, action, params.privateKey),
      },
    });
    const ecommercePage = new EcommercePage(page);
    await ecommercePage.goToCheckoutInStepsPage();
    await ecommercePage.clickOnContinue();
    const modalExperienceTypePage = new ModalExperienceTypePage(page);
    await modalExperienceTypePage.selectExperienceType('Checkout Widget');
    await modalExperienceTypePage.clickOnConfirm();
  }
}
