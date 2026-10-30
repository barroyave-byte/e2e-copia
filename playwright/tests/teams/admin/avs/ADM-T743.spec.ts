import { test } from '@support/fixtures';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminAvsPage, AVS_CONFIG_CHECKBOXES } from '@pages/admin/adminAvsPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression create and edit AVS rules configuration and verify persistence', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.amexProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T743 Create and edit an AVS rules configuration',
    { tag: ['@admin', '@team_admin', '@admin_smoke', '@preprod', '@admin_ui'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminAvsPage = new AdminAvsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user navigates to error management page', async () => {
        await adminHomePage.goToErrorManagement();
      });

      await test.step('The user clicks on AVS tab to view AVS configuration', async () => {
        await adminAvsPage.clickAvsTab();
      });

      await test.step('The user activates the AVS toggle switch', async () => {
        await adminAvsPage.activateAvsToggle();
      });

      await test.step('The user selects random AVS codes', async () => {
        await adminAvsPage.selectRandomAvsCodeCheckboxes();
      });

      await test.step('The user selects the configuration checkboxes', async () => {
        await adminAvsPage.selectConfigurationCheckboxes();
      });

      await test.step('The user saves the AVS configuration', async () => {
        await adminAvsPage.saveConfiguration();
      });

      await test.step('The user verifies the success toast appears', async () => {
        await adminAvsPage.verifySuccessToast();
      });

      await test.step('The user verifies all selected checkboxes remain checked after save', async () => {
        await adminAvsPage.verifyAllSelectedCheckboxesRemainChecked();
      });

      await test.step('The user reloads the page', async () => {
        await page.reload();
      });

      await test.step('The user navigates back to error management page', async () => {
        await adminHomePage.goToErrorManagement();
      });

      await test.step('The user clicks on AVS tab again to verify persistence', async () => {
        await adminAvsPage.clickAvsTab();
      });

      await test.step('The user verifies all previously selected checkboxes remain checked after reload', async () => {
        await adminAvsPage.verifyAllSelectedCheckboxesRemainChecked();
      });

      await test.step('The user modifies AVS code selection randomly', async () => {
        await adminAvsPage.selectRandomAvsCodeCheckboxes();
        await adminAvsPage.deselectRandomAvsCodeCheckboxes();
      });

      await test.step('The user toggles one configuration checkbox', async () => {
        await adminAvsPage.toggleConfigurationCheckbox(AVS_CONFIG_CHECKBOXES.UNKNOWN);
      });

      await test.step('The user saves the modified AVS configuration', async () => {
        await adminAvsPage.saveConfiguration();
      });

      await test.step('The user verifies the success toast appears after modification', async () => {
        await adminAvsPage.verifySuccessToast();
      });

      await test.step('The user verifies modified checkboxes remain checked after save', async () => {
        await adminAvsPage.verifyAllSelectedCheckboxesRemainChecked();
      });

      await test.step('The user reloads the page again', async () => {
        await page.reload();
      });

      await test.step('The user navigates back to error management page again', async () => {
        await adminHomePage.goToErrorManagement();
      });

      await test.step('The user clicks on AVS tab again to verify persistence after modification', async () => {
        await adminAvsPage.clickAvsTab();
      });

      await test.step('The user verifies modified checkboxes remain checked after reload', async () => {
        await adminAvsPage.verifyAllSelectedCheckboxesRemainChecked();
      });
    }
  );
});
