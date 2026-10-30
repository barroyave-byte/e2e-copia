import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test } from '@support/fixtures';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { retryGetOrderStatus } from '@support/utils/retries';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as validationRefund from '@support/interfaces/refund';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'mastercard',
          enabled: true,
          installment_rate: '0',
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
  installments_type: 'MSI',
  campaign_date: null,
  processor: [ConnectionsAvailable.bamboo],
  months: [3],
  months_config: configInstallmentsMonth,
};

const payloadOrder = {
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
      email: userEmail,
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
      email: userEmail,
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

const customProcessorUY = {
  ...processorsConfig.bambooProcessorUY,
  allow_installments: true,
  currency_iso3: 'UYU',
};

const customCard = {
  ...creditCardData.bambooCreditCardUY,
  number: '5101980000000000',
  cvv_code: '123',
};

test.describe('@regression feature to validate with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService, userAuthService }) => {
    const merchant = await configMerchant.basicSetup('UY');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    const registeredUser = await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: payloadOrder.order.billing_address.phone,
        identity_document: payloadOrder.order.billing_address.identity_document,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      customCard,
      userAddressCreditCard.userAddressCreditCardUY,
      merchantId,
      privateKey,
      undefined,
      registeredUser.user
    );

    await apiCallNewman.createPaymentProcessor(customProcessorUY, merchantId, merchantToken);
    const tokenizedOrderResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payloadOrder as any
    );
    orderToken = tokenizedOrderResponse.data.token;
  });

  test(
    '@PI-T2058 Purchase with a tokenized card - using MSI - and a refund via Bamboo in Uruguay',
    {
      tag: ['@team_payment_integration', '@fixme_preprod'],
    },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const installments = '3';

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignBamboo);

      await test.step('The user navigates to the payment widget screen as registered user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card', async () => {
        await paymentDeunaNowPage.fillCvvCode(customCard.cvv_code);
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validates order status is correct, number and type of installments', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed', 3000, 10);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
      });

      await test.step('The processed transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });
    }
  );
});
