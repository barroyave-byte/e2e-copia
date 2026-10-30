import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminAvsPage } from '@pages/admin/adminAvsPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression ADM-T742 - configure AVS rules', () => {
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
    '@ADM-T742 Configure AVS rules',
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
    }
  );
});
