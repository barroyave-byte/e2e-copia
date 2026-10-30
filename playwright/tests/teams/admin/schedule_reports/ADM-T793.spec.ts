import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { ADMIN_DEFAULT_PASSWORD } from '@pages/admin/constants/commons';

const networkName = `network_${faker.lorem.slug()}_name`.replace(/-/g, '_');
const merchantsCount = 3;
const ordersPerMerchant = 10;
const defaultOrdersPerPage = 10;
const totalExpectedOrders = merchantsCount * ordersPerMerchant;
const expectedPages = Math.ceil(totalExpectedOrders / defaultOrdersPerPage);
const orderCreationIntervalMs = 1100;

let adminEmail: string;
let merchantId: string;
let merchantToken: string;
let networkId: string;

test.describe('@regression Admin user with parent account can to visualize orders', () => {
  test.beforeAll(async ({ emaService, merchantAuthService, paymentService, userAuthService }) => {
    const merchants = await Promise.all(
      Array.from({ length: merchantsCount }, () =>
        merchantAuthService.createBasicMerchant({ country: 'MX' })
      )
    );

    const primaryMerchant = merchants[0];
    const merchantIds = merchants.map((merchant) => merchant.merchantId);

    merchantId = primaryMerchant.merchantId;
    merchantToken = primaryMerchant.merchantToken;

    const network = await userAuthService.createNetwork({
      merchantToken: primaryMerchant.merchantToken,
      data: {
        name: networkName,
        is_private: true,
        parent_account_enabled: true,
      },
    });
    networkId = network.id;

    await Promise.all(
      merchants.map((merchant) =>
        userAuthService.addMerchantToNetwork({
          merchantToken: merchant.merchantToken,
          network_id: network.id,
          merchant_id: merchant.merchantId,
        })
      )
    );

    const merchantOrderContexts = await Promise.all(
      merchants.map(async (merchant) => {
        const [, userAuthResponse] = await Promise.all([
          apiCallNewman.createPaymentProcessor(
            processorsConfig.kushkiProcessor,
            merchant.merchantId,
            merchant.merchantToken
          ),
          userAuthService.loginAsGuest(merchant.merchantId, merchant.privateKey),
        ]);

        return {
          merchant,
          userToken: userAuthResponse.data.token,
        };
      })
    );

    let ordersCreated = 0;
    for (let orderIndex = 0; orderIndex < ordersPerMerchant; orderIndex++) {
      for await (const { merchant, userToken } of merchantOrderContexts) {
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchant.privateKey);

        await paymentService.purchaseV2(
          merchant.privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessor.name ?? '',
            card: creditCardData.kushkiVisaSuccessfull,
            token: tokenized.data.token,
          })
        );

        ordersCreated++;
        if (ordersCreated < totalExpectedOrders) {
          await new Promise((resolve) => setTimeout(resolve, orderCreationIntervalMs));
        }
      }
    }

    adminEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantIds,
      network.id,
      primaryMerchant.merchantToken
    );
  });

  test(
    '@ADM-T793 Admin user validates orders pagination in a private network with parent account enabled',
    { tag: ['@user_auth', '@team_admin'] },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const pageSize = defaultOrdersPerPage;

      await test.step('Re-authenticate as network admin user', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminLoginPage.loginWithEmailAndPassword(adminEmail, ADMIN_DEFAULT_PASSWORD);
      });

      await test.step('Navigate to orders', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('Select network merchant', async () => {
        await adminHomePage.selectNetwork(networkName, networkId);
      });

      await test.step('Validate orders table starts on page one', async () => {
        await adminOrdersPage.assertFiltersLoaded();
        await adminOrdersPage.assertCurrentPage(1);
        await adminOrdersPage.assertTotalPages(expectedPages);
        await adminOrdersPage.assertOrdersLoaded(pageSize);
      });

      await test.step('Navigate forward page by page', async () => {
        const forwardPages = Array.from({ length: expectedPages - 1 }, (_, i) => i + 1);
        for await (const pageNumber of forwardPages) {
          await adminOrdersPage.goToPaginatorNextPage();
          await adminOrdersPage.assertCurrentPage(pageNumber + 1);
          await adminOrdersPage.assertOrdersLoaded(pageSize);
        }
      });

      await test.step('Navigate backwards page by page', async () => {
        const backwardPages = Array.from(
          { length: expectedPages - 1 },
          (_, i) => expectedPages - i
        );
        for await (const pageNumber of backwardPages) {
          await adminOrdersPage.goToPaginatorPrevPage();
          await adminOrdersPage.assertCurrentPage(pageNumber - 1);
          await adminOrdersPage.assertOrdersLoaded(pageSize);
        }
      });

      await test.step('Validate orders per page selector resets to page one', async () => {
        await adminOrdersPage.selectPaginationOption(`${pageSize}`);
        await adminOrdersPage.assertCurrentPage(1);
        await adminOrdersPage.assertTotalPages(expectedPages);
        await adminOrdersPage.assertOrdersLoaded(pageSize);
      });
    }
  );
});
