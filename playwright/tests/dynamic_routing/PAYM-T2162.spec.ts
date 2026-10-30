import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';

const configMerchant = new ConfigMerchant();

let orderToken = '';
let merchantId: string;
let merchantName: string;
let privateKey: string;
let orderId: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderId = tokenizeResult.data.order.order_id;
    orderToken = tokenizeResult.data.token;
  });

  test(
    '@PAYM-T2162 Configurar routing para kushki y CVV y luego realizar pago con kushki sin enviar CVV',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ page, paymentService, userAuthService }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      await test.step('The user opens the admin and configure connection and routing', async () => {
        await adminConsolidatedFlows.configureConnectionWithLoginAndMerchant(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessor,
          merchantId
        );
        await adminHomePage.goToPaymentStrategy();
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.kushki);
      });

      await test.step('The user makes a purchase without sending the CVV', async () => {
        const guestLoginResult = await userAuthService.loginAsGuest(merchantId, privateKey);
        const purchaseResult = await paymentService.purchase(
          privateKey,
          guestLoginResult.data.token,
          {
            method_type: 'credit_card',
            processor_name: 'kushki',
            amount: 3000,
            email: 'Kiara.Terry@yahoo.com',
            credit_card: {
              expiry_month: '11',
              expiry_year: '2025',
              card_holder: 'Duna Developers',
              card_holder_dni: '185396924',
              card_number: '4168818844447115',
              address1: 'Vergara 548',
              zip: '001100',
              city: 'santiago',
              state: 'rm',
              country: 'cl',
              phone: '12345755',
            },
            token: orderToken,
          } as any,
          true
        );
        expect(purchaseResult.data.error.code).toBe('DP-4100');
        expect(purchaseResult.data.error.description).toBe('missing security_code');
      });
    }
  );
});
