import { CommonsActions } from '@pages/commonActions';
import { WebSdkVersion, WidgetOptionsExplore } from '@support/interfaces/experienceTypesExplore';
import { expect, Locator, Page } from '@playwright/test';
import envConfig from '@support/envConfig';
import * as crypto from 'crypto';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FraudProvidersObject, Providers } from './fraud_providers/interfaces';
import { FraudProviderPage } from './fraud_providers/fraudProvidersPage';

const SUPPORTED_LANGUAGES: Record<LanguageCodes, string> = {
  EN: 'Inglés',
  ES: 'Español',
  PT: 'Portugués',
};

export class ConfigExplorePage extends CommonsActions {
  readonly page: Page;
  readonly inputPrivateKey: Locator;
  readonly inputPublicKey: Locator;
  readonly inputUserEmail: Locator;
  readonly inputOrderToken: Locator;
  readonly userTokenInput: Locator;
  readonly inputAddCSSVault: Locator;
  readonly containerNavbar: Locator;

  readonly buttonMenuSidebar: Locator;
  readonly buttonCloseSidebar: Locator;
  readonly drawerConfiguration: Locator;
  readonly buttonExpore: Locator;
  readonly accordeonPaymentMethodsConfig: Locator;
  readonly accordeonAntiFraudProvidersConfig: Locator;
  readonly accordeonWebSdkVersionConfig: Locator;
  readonly webSdkVersionSelector: Locator;
  readonly options?: WidgetOptionsExplore;
  readonly dropdownLanguage: Locator;

  readonly checkboxSafetypayExpress: Locator;
  readonly checkboxBazReference: Locator;
  readonly checkboxOxxoReference: Locator;
  readonly checkboxPurchaseV2CC: Locator;
  readonly checkboxSplitPayment: Locator;
  readonly checkboxOnlyCardEnrollment: Locator;
  readonly checkboxCSSVault: Locator;
  readonly checkboxDisablePayButtonWidget: Locator;

  readonly radioButtonPurchaseV1: Locator;
  readonly checkboxInitNextAction: Locator;

  //Locators
  constructor(page: Page, options?: WidgetOptionsExplore) {
    super(page);
    this.options = options;
    this.page = page;
    this.buttonMenuSidebar = page.locator('#menu_button');
    this.inputPublicKey = page.locator('#public-key-input');
    this.inputPrivateKey = page.locator('#private-key-input');
    this.containerNavbar = page.locator('div[data-testid="navbar"]');
    this.buttonCloseSidebar = page.getByLabel('Close');
    this.drawerConfiguration = page.locator('[data-baseweb="drawer"]');
    this.inputOrderToken = page.locator('#order_token_input');
    this.userTokenInput = page.locator('#user_token_input');
    this.radioButtonPurchaseV1 = page.locator('span[data-testid="purchase-version-v1"]');
    this.buttonExpore = page.locator('#explore_button');
    this.accordeonPaymentMethodsConfig = page.locator('#accordeon_payment_methods');
    this.accordeonAntiFraudProvidersConfig = page.locator('#accordeon_fraud_providers');
    this.accordeonWebSdkVersionConfig = page.locator('#accordeon_web_sdk_version');
    this.webSdkVersionSelector = page.locator('#web-sdk-version-selector');
    this.checkboxPurchaseV2CC = page.locator('#checkbox_purchase_v2_cc');
    this.checkboxCSSVault = page.locator('#checkbox_css_vault');
    this.inputAddCSSVault = page.locator('#input_add_css_vaulty');
    this.dropdownLanguage = page.locator('#dropdown-language');
    this.checkboxSplitPayment = page.locator('#checkbox_purchase_split_payments');
    this.checkboxOnlyCardEnrollment = page.getByTestId('checkbox_only_card_enrollment');
    this.inputUserEmail = page.locator('#user_email_input');
    this.checkboxSafetypayExpress = page.locator('#checkbox_safetypay_express');
    this.checkboxBazReference = page.locator('#checkbox_baz_reference');
    this.checkboxOxxoReference = page.locator('#checkbox_oxxo_reference');
    this.checkboxDisablePayButtonWidget = page.locator('#checkbox_disable_pay_button_widget');
    this.checkboxInitNextAction = page.locator('#checkbox_init_next_action');
  }

  //Navigation
  async gotoExplore() {
    const url = this.options?.exploreUrl ?? process.env.EXPLORE_URL;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(1000);
    await this.page.reload();
    await this.page.waitForTimeout(1000);
  }

  //Actions
  async deleteSessionCdn() {
    await this.page.goto(`${envConfig.CDL_URL}/cdl/storageSite/index.html`);
    await this.page.evaluate((sessionId) => {
      localStorage.setItem('sessionId', sessionId);
    }, crypto.randomUUID());
  }

  async clickMenuSidebar() {
    await this.buttonMenuSidebar.click();
  }

  /**
   * Whether the configuration drawer is on screen. The drawer usually opens by itself on load, but
   * not always, and when it does not its inputs can stay rendered off-screen: isVisible() reports
   * them visible and fill() still works on them, so only the first click inside the drawer fails,
   * retrying "element is outside of the viewport" until the test times out (six 4-minute timeouts
   * in run regression-stg-cca02f6a).
   */
  private async isConfigurationDrawerOpen(): Promise<boolean> {
    if ((await this.inputPublicKey.count()) === 0) return false;
    return this.inputPublicKey.evaluate((input) => {
      const box = input.getBoundingClientRect();
      return (
        box.width > 0 &&
        box.right > 0 &&
        box.left < window.innerWidth &&
        box.bottom > 0 &&
        box.top < window.innerHeight
      );
    });
  }

  /**
   * The drawer can also stay mounted with its panel off-screen. Its backdrop then covers the page
   * and every click on it retries "subtree intercepts pointer events" until the test times out
   * (four 4-minute timeouts in run regression-stg-41ba24a8, on the menu button). Escape closes it.
   */
  private async closeOffScreenConfigurationDrawer() {
    if ((await this.drawerConfiguration.count()) === 0) return;
    await this.page.keyboard.press('Escape');
    await expect(this.drawerConfiguration, 'The configuration drawer did not close').toHaveCount(0);
  }

  private async openConfigurationDrawer() {
    if (!(await this.isConfigurationDrawerOpen())) {
      await this.closeOffScreenConfigurationDrawer();
      await this.clickMenuSidebar();
    }
    await expect(this.inputPublicKey, 'The configuration drawer did not open').toBeInViewport();
  }

  async clickAccordeonPaymentMethodsConfig() {
    await this.accordeonPaymentMethodsConfig.click();
  }

  async clickAccordeonAntiFraudProcessor(providerObject: FraudProvidersObject) {
    await this.accordeonAntiFraudProvidersConfig.click();
    const providerKeyMap = Object.keys(providerObject);

    for (const providerKey of providerKeyMap) {
      await this.configProvider({
        key: providerKey as Providers,
        provider: providerObject[providerKey],
      });
    }
  }

  async clickConfigWebSdkVersion(webSdkVersion: WebSdkVersion) {
    await this.accordeonWebSdkVersionConfig.click();
    await this.webSdkVersionSelector.click();
    await this.page.locator(`[id="${webSdkVersion}"]`).click();
  }

  async configProvider(providerKey: {
    key: Providers;
    provider: Record<string, string | boolean>;
  }) {
    const antifraudProvider = this.page.locator(`[id="provider-${providerKey.key.toLowerCase()}"]`);
    await this.ensureVisibleToClick(antifraudProvider);

    if (!providerKey.provider || !Object.keys(providerKey.provider).length) {
      return;
    }

    const fraudProviderPage = new FraudProviderPage(this.page);
    await fraudProviderPage.fillForm(providerKey.key, providerKey.provider);
  }

  async clickCheckboxSplitPayment() {
    await this.ensureVisibleToClick(this.checkboxSplitPayment);
  }

  async clickCheckboxOnlyCardEnrollment() {
    await this.ensureVisibleToClick(this.checkboxOnlyCardEnrollment);
  }

  async clickCheckboxPurchaseV1() {
    await this.ensureVisibleToClick(this.radioButtonPurchaseV1);
  }

  async clickCheckboxPurchaseV2CC() {
    await this.ensureVisibleToClick(this.checkboxPurchaseV2CC);
  }

  async clickCheckboxCSSVault() {
    await this.ensureVisibleToClick(this.checkboxCSSVault);
  }

  async clickCheckboxDisablePayButtonWidget() {
    await this.ensureVisibleToClick(this.checkboxDisablePayButtonWidget);
  }

  async enterCSSVault(cssFile?: string) {
    await this.fillAndVerifyValue(this.inputAddCSSVault, cssFile);
  }

  async fillUserEmail(userEmail: string) {
    await this.inputUserEmail.fill(userEmail);
  }

  async enterApiKeys(publicKey: string, privateKey: string) {
    await this.inputPublicKey.fill(publicKey);
    await this.inputPrivateKey.fill(privateKey);
  }

  async enterOrderToken(orderToken?: string) {
    if (!orderToken) return;
    await this.inputOrderToken.fill(orderToken);
  }

  async enterUserToken(userToken: string) {
    await this.userTokenInput.fill(userToken);
  }

  async clickCloseSidebar() {
    await this.buttonCloseSidebar.click();
  }

  async withCSSFile(cssFile?: string) {
    await this.clickAccordeonPaymentMethodsConfig();
    await this.clickCheckboxCSSVault();
    await this.enterCSSVault(cssFile);
  }

  async vaultWebSdkConfig() {
    const actionRegistry = {
      withInitNextAction: () => this.ensureVisibleToClick(this.checkboxInitNextAction),
    };

    const activeConfigs = this.options.vaultWebSdkConfig;

    for (const [key, shouldExecute] of Object.entries(activeConfigs)) {
      if (shouldExecute && actionRegistry[key]) {
        await actionRegistry[key]();
      }
    }
  }

  async withReferenceSetting(generatorsExcluded: string[]) {
    await this.clickAccordeonPaymentMethodsConfig();

    const generatorMap: Record<string, Locator> = {
      safetypay_express: this.checkboxSafetypayExpress,
      baz_reference: this.checkboxBazReference,
      oxxo_reference: this.checkboxOxxoReference,
    };

    for (const generator of generatorsExcluded) {
      if (generatorMap[generator]) {
        await generatorMap[generator].click();
      }
    }
  }

  private async settingLanguage() {
    if (await this.isConfigurationDrawerOpen()) {
      await this.clickCloseSidebar();
    } else {
      await this.closeOffScreenConfigurationDrawer();
    }

    await this.selectLanguage(this.options?.language);
  }

  async fillMerchantSettingsAndExplore(
    publicKey: string,
    privateKey: string,
    userToken: string = '',
    orderToken: string,
    withSplitPayment: boolean = false,
    withOnlyCardEnrollment: boolean = false,
    disablePayButtonWidget: boolean = false,
    antiFraudProviders: FraudProvidersObject | null = null,
    webSdkVersion: WebSdkVersion | null = null,
    purchaseV1: boolean = false
  ) {
    await this.gotoExplore();

    if (this.options?.language) {
      await this.settingLanguage();
    }

    await this.openConfigurationDrawer();
    await this.enterApiKeys(publicKey, privateKey);

    await this.enterOrderToken(orderToken);
    if (userToken) await this.enterUserToken(userToken);

    if (this.options?.customStyle) {
      await this.withCSSFile(this.options.customStyle.cssFile);
    }

    if (this.options?.generatorsExcluded) {
      await this.withReferenceSetting(this.options.generatorsExcluded);
    }

    if (this.options?.vaultWebSdkConfig) {
      await this.clickAccordeonPaymentMethodsConfig();
      await this.vaultWebSdkConfig();
    }

    if (withSplitPayment) {
      await this.clickAccordeonPaymentMethodsConfig();
      await this.clickCheckboxSplitPayment();
    }
    if (withOnlyCardEnrollment) {
      await this.clickAccordeonPaymentMethodsConfig();
      await this.clickCheckboxOnlyCardEnrollment();
    }
    if (disablePayButtonWidget) {
      await this.clickAccordeonPaymentMethodsConfig();
      await this.clickCheckboxDisablePayButtonWidget();
    }
    if (this.options?.antiFraudProviders) {
      await this.clickAccordeonAntiFraudProcessor(this.options.antiFraudProviders);
    }
    if (webSdkVersion) {
      await this.clickConfigWebSdkVersion(webSdkVersion);
    }
    if (purchaseV1) await this.enablePurchaseV1();
    await this.buttonExpore.click();
  }

  async enableSplitPayment() {
    await this.clickAccordeonPaymentMethodsConfig();
    await this.clickCheckboxSplitPayment();
  }

  async enablePurchaseV1() {
    await this.clickAccordeonPaymentMethodsConfig();
    await this.clickCheckboxPurchaseV1();
  }

  async selectLanguage(language: LanguageCodes) {
    if (!language) {
      return;
    }

    await this.ensureVisibleToClick(this.dropdownLanguage);
    const languageText = SUPPORTED_LANGUAGES[language];
    const languageSelected = await this.dropdownLanguage.getByText(languageText).first();
    await this.ensureVisibleToClick(languageSelected);
  }
  //Assertions:
}
