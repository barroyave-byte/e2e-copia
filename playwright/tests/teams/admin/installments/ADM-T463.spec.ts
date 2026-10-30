import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { Locator, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminInstallmentsPage } from '@pages/admin/installments_configuration/adminInstallmentsPage';
import { AdminCreateInstallmentCampaignPage } from '@pages/admin/installments_configuration/adminCreateInstallmentCampaignPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Effective create a new campaign to openpay as psp', () => {
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
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T463 Create Installment Campaign with OPENPAY as PSP',
    {
      tag: [
        '@admin',
        '@smoke',
        '@admin-preprod',
        '@team_admin',
        '@installments',
        '@preprod',
        '@admin_ui',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminInstallmentPage = new AdminInstallmentsPage(page);
      const adminCreateInstallmentCampaignPage = new AdminCreateInstallmentCampaignPage(page);
      const months = [1, 3];

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to installments and click to btn create campaign', async () => {
        await page.waitForTimeout(2500);
        await adminHomePage.goToInstallments();
        await page.waitForTimeout(800);
        await adminInstallmentPage.createCampaignClick();
      });

      await test.step('Fill campaign details', async () => {
        await adminCreateInstallmentCampaignPage.fillCampaignDetails('MSI', 'CustomCampaign');
      });

      await test.step('Select no specific term', async () => {
        await adminCreateInstallmentCampaignPage.isCheckedNoSpecificTerm();
      });

      await test.step('Select the OpenPay processor', async () => {
        await adminCreateInstallmentCampaignPage.verifyPSPVisibleToSelect(
          adminCreateInstallmentCampaignPage.chipPspOpenPay
        );
      });

      await test.step('Select installment months and verify selection can be toggled', async () => {
        const activateDeactivateReactivateCheckbox = (checkbox: Locator) => {
          const monthsObject = Object.assign(
            {},
            ...months.map((month) => ({
              [month]: async () => {
                await checkbox.click(); // checked
                await page.waitForTimeout(500);
                await checkbox.click(); // unchecked
                await page.waitForTimeout(500);
                await checkbox.click(); // checked
              },
            }))
          );
          return monthsObject;
        };

        await adminCreateInstallmentCampaignPage.selectMonthsToInstallment(
          months,
          activateDeactivateReactivateCheckbox
        );
      });

      await test.step('Configure Visa for the selected months', async () => {
        await adminCreateInstallmentCampaignPage.configureInstallmentMonths({
          config_months: months.map((month) => ({
            months: month,
            enabled: true,
            config_franchise: [
              {
                franchise: 'visa',
                enabled: true,
                installment_rate: '1.2',
                min_amount: '500',
                max_amount: '100000',
              },
            ],
          })),
        });
      });

      await test.step('save and active campaign installment click', async () => {
        const response = await adminCreateInstallmentCampaignPage.saveActiveCampaignClick();
        await adminCreateInstallmentCampaignPage.validateProcessorName(response, 'OPENPAY');
      });
    }
  );
});
