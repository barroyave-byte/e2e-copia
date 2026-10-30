import { BasePageOpenWidget } from './BasePageOpenWidget';
import { ConfigExplorePage } from '@pages/explore/configExplorePage';
import { ModalExperienceTypePage } from '@pages/explore/modalExperienceTypePage';
import {
  ExperienceTypesExplore,
  WidgetSetupOptions,
} from '@support/interfaces/experienceTypesExplore';
import { Page } from '@playwright/test';

class ExploreNavigator extends BasePageOpenWidget {
  constructor(
    page: Page,
    private experienceType: ExperienceTypesExplore,
    private withOrderToken: boolean = true,
    private withSplitPayment: boolean = false,
    private disablePayButtonWidget: boolean = false
  ) {
    super(page);
  }

  async setUpExplore(options: WidgetSetupOptions) {
    options = { deleteSession: true, ...options };
    const configExplorePage = new ConfigExplorePage(this.page, options);
    if (options?.deleteSession) await configExplorePage.deleteSessionCdn();
    await configExplorePage.fillMerchantSettingsAndExplore(
      options.merchantCredentials.publicKey,
      options.merchantCredentials.privateKey,
      options?.userToken ?? undefined,
      this.withOrderToken ? options.orderToken : '',
      this.withSplitPayment,
      options?.withOnlyCardEnrollment,
      this.disablePayButtonWidget
    );
  }

  async navigateToSelectOrderType() {
    const modalExperienceTypePage = new ModalExperienceTypePage(this.page);
    await modalExperienceTypePage.selectExperienceTypeAndConfirm(this.experienceType);
  }

  async fillUserEmail(userEmail: string) {
    const configExplorePage = new ConfigExplorePage(this.page);
    await configExplorePage.fillUserEmail(userEmail);
  }

  async navigateAndSetup(options: WidgetSetupOptions) {
    options = { deleteSession: true, ...options };
    const configExplorePage = new ConfigExplorePage(this.page, options);
    if (options?.deleteSession) await configExplorePage.deleteSessionCdn();
    await configExplorePage.fillMerchantSettingsAndExplore(
      options.merchantCredentials.publicKey,
      options.merchantCredentials.privateKey,
      options?.userToken ?? undefined,
      options.orderToken,
      options?.withSplitPayment,
      options?.withOnlyCardEnrollment,
      options?.disablePayButtonWidget,
      options?.antiFraudProviders,
      options?.webSdkVersion,
      options?.purchaseV1
    );

    await this.navigateToSelectOrderType();
  }

  async enableSplitPayment() {
    const configExplorePage = new ConfigExplorePage(this.page);
    await configExplorePage.enableSplitPayment();
  }

  async enablePurchaseV1() {
    const configExplorePage = new ConfigExplorePage(this.page);
    await configExplorePage.enablePurchaseV1();
  }
}

/**
 * This function is used to navigate to the page and configure the widget based on the experience type
 * @param page
 * @param experienceType
 * @returns
 */
export function nagivateAndConfigureWidget(
  page: any,
  experienceType: ExperienceTypesExplore,
  withOrderToken: boolean = false,
  withSplitPayment: boolean = false,
  disablePayButtonWidget: boolean = false
): ExploreNavigator {
  console.log(`Widget to Open: ${experienceType}`);
  return new ExploreNavigator(
    page,
    experienceType,
    withOrderToken,
    withSplitPayment,
    disablePayButtonWidget
  );
}
