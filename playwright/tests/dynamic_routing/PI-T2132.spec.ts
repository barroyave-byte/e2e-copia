import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentCalculator } from '@support/utils/paymentCalculator';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const installments = '3';
const configMerchant = new ConfigMerchant();
const totalAmount = 3000;
const fullMetadataField = 'additional_data.commercial_condition';

const firstConfig = {
  rule_name: 'First metadata rule',
  metadata_field_name: 'commercial_condition',
  metadata_value: '1',
  processor_id: processorsConfig.prismaPaywayProcessor.payment_processor_id,
  merchant_payment_processor_id: '',
  full_metadata_field: fullMetadataField,
};

const secondConfig = {
  rule_name: 'Second metadata rule',
  metadata_field_name: 'commercial_condition',
  metadata_value: '2',
  processor_id: processorsConfig.prismaPaywayProcessor2.payment_processor_id,
  merchant_payment_processor_id: '',
  full_metadata_field: fullMetadataField,
};

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 6,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 9,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
  ],
};

const installmentsCampaignPrisma: InstallmentsCampaign = {
  name: 'Test campaign - Prisma',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: null,
  months: [3, 6, 9],
  months_config: configInstallmentsMonth,
};

const getRoutingRule = (config: any) => {
  return {
    label: config.rule_name,
    conditions: [
      {
        metadata_field_name: config.metadata_field_name,
        metadata_field_type: 'text',
        operand: config.metadata_value,
        operator: 'contains',
        rule_option: {
          id: 16,
          label: 'metadata',
        },
      },
    ],
    isTransact: true,
    is_default: false,
    trigger: 'payment',
    children: [],
    ignore_next_rules: true,
    priority: 5,
    status: 'enabled',
    members: [
      {
        payment_processor_id: config.processor_id,
        capabilities: ['cvv'],
        sort: 1,
        merchant_payment_processor_id: config.merchant_payment_processor_id,
        strategy: 'cascade',
      },
    ],
  };
};

const getOrderBodyWithMetadata = (config: any) => {
  let bodySent = {
    order_type: 'PAYMENT_LINK',
    order: {
      order_id: crypto.randomUUID(),
      currency: 'ARS',
      timezone: 'America/Buenos_Aires',
      tax_amount: 3000,
      shipping_amount: 3000,
      items_total_amount: 3000,
      sub_total: 3000,
      processor_name: 'all',
      total_amount: 3000,
      store_code: 'all',
      items: [
        {
          id: '79',
          name: '10 ALITAS VOLANTE',
          description: '10 alitas picantes',
          options: 'string option',
          total_amount: {
            amount: 1200,
            currency: 'ARS',
            currency_symbol: '$',
          },
          unit_price: {
            amount: 850,
            currency: 'ARS',
            currency_symbol: '$',
          },
          tax_amount: {
            amount: 100,
            currency: 'ARS',
            currency_symbol: '$',
          },
          quantity: 1,
          uom: 'string',
          upc: 'string',
          sku: 'SKU-11021',
          isbn: '12-345-678-90123',
          brand: 'Bolt Swagstore',
          manufacturer: 'Bolt Factory',
          category: 'hats',
          color: 'Red',
          size: 'XXL',
          weight: {
            weight: 22,
            unit: 'kg',
          },
          image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
          details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
          type: 'physical',
          taxable: true,
        },
      ],
      discounts: [
        {
          amount: 500,
          code: 'SUMMERFUN15',
          reference: 'SUMMERFUN15',
          description: '',
          details_url: 'https://boltswagstore.com/discounts/#12345',
          free_shipping: {
            is_free_shipping: false,
            maximum_cost_allowed: 100,
          },
          discount_category: 'coupon',
        },
      ],
      shipping_options: {
        type: 'pickup',
        details: {
          store_name: 'Store Name',
          address: '6 Rotermanni 11343 Talinn',
          address_coordinates: {
            lat: 4.721245,
            lng: -74.04673,
          },
          contact: {
            name: 'jhon snow',
            phone: '972514910',
          },
          additional_details: {
            pickup_time: '2021-11-03T22:09:09.086990957Z',
            stock_location: '',
          },
        },
      },
      user_instructions: 'This item is a gift.',
      metadata: {},
    },
  };

  bodySent.order.metadata[config.full_metadata_field] = [config.metadata_value];
  return bodySent;
};

let privateKey: string;
let publicKey: string;
let merchantId: string;
let merchantToken: string;
let orderToken: string;
let merchantName: string;

test.describe('@regression Purchases existosos con plan de installments consolidado con dos credenciales del mismo PSP, utilizando dynamic routing para la seleccion de cada uno de los PSPs', () => {
  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // create first processor
    firstConfig.merchant_payment_processor_id = await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor,
      merchantId,
      merchantToken
    );
    // create second processor
    secondConfig.merchant_payment_processor_id = await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor2,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2132 Purchases existosos con plan de installments consolidado con dos credenciales del mismo PSP - utilizando dynamic routing para la seleccion de cada uno de los PSPs',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@dynamic_routing',
        '@team_payments_capabilities',
      ],
    },
    async ({ page, emaService, paymentRoutingService, paymentService }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Create installment campaign', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignPrisma);
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      });

      await paymentService.createConfigMerchantPayments(
        USE_DYNAMIC_ROUTING_ENABLED,
        merchantId,
        merchantToken
      );

      await test.step('Configure payment strategy by first metadata value', async () => {
        await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          getRoutingRule(firstConfig) as Record<string, unknown>
        );
      });

      await test.step('Configure payment strategy by second metadata value', async () => {
        await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          getRoutingRule(secondConfig) as Record<string, unknown>
        );
      });

      await test.step('Make purchase with first metadata value', async () => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          getOrderBodyWithMetadata(firstConfig) as any
        );
        orderToken = tokenized.data.token;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('The user inserts a credit card from widget de pagos', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.prismaPaywayVisaSuccessful,
            { country: 'AR' }
          );
        });

        await test.step('User select MSI', async () => {
          await paymentDeunaNowPage.selectInstallmentsMSI(installments);
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        });

        await test.step('Validate in admin  order installments MSI details', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
          await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
          await adminOrderDetailsPage.assertTypeInstallments('MSI');
          await adminOrderDetailsPage.assertProcessorName(
            processorsConfig.prismaPaywayProcessor.name
          );

          const installmentsAmount = PaymentCalculator.calculateInstallmentAmount(
            totalAmount,
            0,
            installments,
            true
          );

          await adminOrderDetailsPage.assertOrderFromCardInstallmentRateAndAmount(
            'ARS',
            installmentsAmount,
            Number(0)
          );
        });
      });

      await test.step('Make purchase with second metadata value', async () => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          getOrderBodyWithMetadata(secondConfig) as any
        );
        orderToken = tokenized.data.token;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('Add a new credit card', async () => {
          await paymentDeunaNowPage.selectOptionAddNewCreditCard();
        })

        await test.step('The user inserts a credit card from widget de pagos', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.prismaPaywayVisaSuccessful,
            { country: 'AR' }
          );
        });

        await test.step('User select MSI', async () => {
          await paymentDeunaNowPage.selectInstallmentsMSI(installments);
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        });

        await test.step('Validate in admin  order installments MSI details', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
          await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
          await adminOrderDetailsPage.assertTypeInstallments('MSI');
          await adminOrderDetailsPage.assertProcessorName(
            processorsConfig.prismaPaywayProcessor2.name
          );

          const installmentsAmount = PaymentCalculator.calculateInstallmentAmount(
            totalAmount,
            0,
            installments,
            true
          );

          await adminOrderDetailsPage.assertOrderFromCardInstallmentRateAndAmount(
            'ARS',
            installmentsAmount,
            Number(0)
          );
        });
      });
    }
  );
});
