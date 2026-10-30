import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order_type: 'DEUNA_NOW',
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'UYU',
    items_total_amount: 1000,
    tax_amount: 0,
    sub_total: 900,
    shipping_amount: 100,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 100,
    total_amount: 1000,
    items: [
      {
        id: crypto.randomUUID(),
        name: 'First item name',
        description: 'First item description',
        total_amount: {
          original_amount: 0,
          amount: 1000,
          total_discount: 0,
          currency: 'UYU',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 450,
          currency: 'UYU',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'UYU',
          currency_symbol: '$',
        },
        quantity: 2,
        taxable: true,
      },
    ],
    shipping_address: {
      id: 111,
      first_name: 'Jhon',
      last_name: 'Smith',
      email: 'john@mail.com',
      address1: 'Av. Primavera',
      address2: 'Edificio Santa Rosa',
      zipcode: '15023',
      city: 'Montevideo',
      state_name: 'Montevideo',
      country_code: 'UY',
      identity_document: '123456789',
      identity_document_type: 'RUT',
      phone: '+51987654321',
      lat: -12.0563,
      lng: -76.9358,
      additional_description: 'Descripción adicional',
      address_type: 'home',
    },
    billing_address: {
      id: 222,
      first_name: 'Jhon',
      last_name: 'Smith',
      email: 'john@mail.com',
      address1: 'Calle Los Sauces',
      address2: 'Residencial Los Olivos',
      zipcode: '07006',
      city: 'Montevideo',
      state_name: 'Montevideo',
      country_code: 'UY',
      identity_document: '123456789',
      identity_document_type: 'RUT',
      phone: '+51987654321',
      lat: -12.06502,
      lng: -76.98295,
      address_type: 'home',
    },
    user_instructions: 'User instructions',
    metadata: {
      origin: 'core',
    },
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
    },
    webhook_urls: {
      notify_order: '',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      'Tarifa de envio': '',
    },
  },
};

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'mastercard',
          enabled: true,
          installment_rate: '1.2',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
  ],
};

const installmentsCampaignBamboo: InstallmentsCampaign = {
  name: 'Test campaign Uruguay - Bamboo',
  description: 'Test campaign description',
  installments_type: 'MCI',
  campaign_date: null,
  processor: [ConnectionsAvailable.bamboo],
  months: [3],
  months_config: configInstallmentsMonth,
};

const customProcessorUY = {
  ...processorsConfig.bambooAuthorizeProcessorUY,
  allow_installments: true,
  currency_iso3: 'UYU',
};

const customCard = {
  ...creditCardData.bambooCreditCardUY,
  number: '5101980000000000',
};

test.describe('@regression Buy with deuna now using installments', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('UY');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(customProcessorUY, merchantId, merchantToken);
    const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder as any);
    orderToken = tokenized.data.token;
  });

  test(
    '@PI-T2045 Capture with MCI using Bamboo in Uruguay',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '3';

      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignBamboo);

      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });

      await test.step('Selecting user guest', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user inserts a credit card from widget de pagos', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(customCard, { country: 'UY' });
      });

      await test.step('User select MCI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validates order status is correct, number and type of installments', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await paymentDeunaNowPage.assertEmaOrderStatus('succeeded');
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MCI');

        await test.step('A total capture is sent to the authorized transaction', async () => {
          await adminOrderDetailsPage.captureTotalOrder();
          await adminOrderDetailsPage.assertPaymentStatus('captured');
        });
      });
    }
  );
});
