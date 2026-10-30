import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import type { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminInstallmentsPage } from '@pages/admin/installments_configuration/adminInstallmentsPage';
import { AdminCreateInstallmentCampaignPage } from './installments_configuration/adminCreateInstallmentCampaignPage';
import type { BaseProcessor } from '@support/interfaces/payment_processors';
import type { Page } from '@playwright/test';
import type { InstallmentsCampaign } from '@pages/admin/installments_configuration/installmentsCampaign';
import type { RuleConditions } from '@support/interfaces/ruleConditions';
import type { ConditionDataMap } from '@support/interfaces/ruleConditions';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';

export class AdminConsolidatedFlows {
  private adminLoginPage: AdminLoginPage;
  private adminHomePage: AdminHomePage;
  private adminConnectionsPage: AdminConnectionsPage;
  private adminInstallmentPage: AdminInstallmentsPage;
  private adminCreateInstallmentCampaignPage: AdminCreateInstallmentCampaignPage;
  private adminSpecificRulesPage: AdminSpecificRulesPage;

  constructor(page: Page, languageCode?: LanguageCodes) {
    this.adminInstallmentPage = new AdminInstallmentsPage(page, languageCode);
    this.adminLoginPage = new AdminLoginPage(page);
    this.adminHomePage = new AdminHomePage(page, languageCode);
    this.adminConnectionsPage = new AdminConnectionsPage(page, languageCode);
    this.adminCreateInstallmentCampaignPage = new AdminCreateInstallmentCampaignPage(
      page,
      languageCode
    );
    this.adminSpecificRulesPage = new AdminSpecificRulesPage(page);
  }

  async configureConnectionWithLoginAndMerchant(
    connection: ConnectionsAvailable,
    processorsConfig: BaseProcessor,
    merchantId: string
  ) {
    await this.adminLoginPage.gotoAdmin();
    await this.adminHomePage.setMerchantIdSessionStorage(merchantId);
    await this.adminHomePage.goToConnections();
    await this.adminConnectionsPage.configureConnection(connection, processorsConfig);
  }

  async goToAdminAndSetMerchantId(merchantId: string) {
    await this.adminLoginPage.gotoAdmin();
    await this.adminHomePage.setMerchantIdSessionStorage(merchantId);
  }

  async configureInstallmentCampaign(installmentsCampaign: InstallmentsCampaign) {
    await this.adminHomePage.goToInstallments();
    await this.adminInstallmentPage.createCampaignClick();
    await this.adminCreateInstallmentCampaignPage.configureCampaign(installmentsCampaign);
    await this.adminCreateInstallmentCampaignPage.configureInstallmentMonths(
      installmentsCampaign.months_config
    );
    await this.adminCreateInstallmentCampaignPage.saveActiveCampaignClick();
  }

  async goToAdminAndConfigureSpecificRule(
    conditions: { condition: RuleConditions; data: ConditionDataMap[RuleConditions] }[],
    merchantId: string,
    ruleName?: string
  ) {
    await this.goToAdminAndSetMerchantId(merchantId);
    await this.adminHomePage.goToPaymentStrategy();
    await this.adminSpecificRulesPage.addConditionsToSpecificRule(conditions, ruleName);
    /* await this.adminSpecificRulesPage.clickOnCreateRoute(); */
  }
}
