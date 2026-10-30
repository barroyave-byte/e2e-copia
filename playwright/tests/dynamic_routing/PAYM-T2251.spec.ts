import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Routing by percentage split - Order Detail visibility', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let ruleId: string;

  test.beforeAll(async ({ merchantAuthService, paymentService, paymentRoutingService }) => {
    const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    const stripeMerchantProcessorId = await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.stripeProcessor as any
    );

    const kushkiMerchantProcessorId = await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.kushkiProcessor as any
    );

    // payments only calls payments-routing during a real purchase when Dynamic Routing
    // is explicitly enabled for the merchant/store (IsDynamicRouting checks the
    // USE_DYNAMIC_ROUTING config code - purchase.go:1602-1603). Without this, the split
    // rule below is created but never evaluated: the purchase silently falls back to the
    // merchant's plain default processor, dynamic_routing_detail stays null, and
    // split_tracking_info never reaches the SNS payload. This is distinct from
    // USE_ROUTING, which only gates the separate Smart Routing (cascading) mechanism.
    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: {
        config_code: 'USE_DYNAMIC_ROUTING',
        config_value: 'ENABLED',
      },
    });

    // route_a and route_b must use different processors - payments-routing rejects a
    // rule with the same payment_processor_id on more than one member ("each member can
    // only exist once per merchant rule"). Since the split's probabilistic draw decides
    // which path (and therefore which processor) a given purchase hits, and PSP sandbox
    // test cards aren't interchangeable across processors, the purchase step below uses
    // expectError so a mismatched-card decline from the "wrong" path doesn't fail the
    // test - split stamping happens at the routing-decision step, before the PSP charge
    // is attempted, so it should be present on the order regardless of that outcome.
    //
    // Payload shape (trigger, capabilities, data_type, enabled3ds, merchant_payment_processor_id)
    // mirrors the exact request the admin frontend sends when creating a default rule with a
    // split - trigger: 'payment' is accepted by the API but is not recognized by the admin
    // frontend as the active default routing rule.
    const rule = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'split order detail visibility test',
      description: '',
      priority: 1,
      status: 'enabled',
      is_default: true,
      trigger: 'merchant_rule',
      data_type: 'credit_card',
      members: [
        {
          payment_processor_id: processorsConfig.stripeProcessor.payment_processor_id,
          merchant_payment_processor_id: stripeMerchantProcessorId,
          sort: 1,
          capabilities: ['cvv'],
          strategy: 'split',
          enabled3ds: false,
          weight: 50,
          path_name: 'route_a',
        },
        {
          payment_processor_id: processorsConfig.kushkiProcessor.payment_processor_id,
          merchant_payment_processor_id: kushkiMerchantProcessorId,
          sort: 2,
          capabilities: ['cvv'],
          strategy: 'split',
          enabled3ds: false,
          weight: 50,
          path_name: 'route_b',
        },
      ],
    } as any);
    ruleId = rule.data.id;
  });

  test(
    '@PAYM-T2251 Routing by Percentage — Order Detail shows the split path and weight for a routed transaction',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.order.createOrder', params: { country: 'MX', privateKey } },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.stripeVisaSuccessful,
              processorName: processorsConfig.stripeProcessor.name,
              merchantId,
              privateKey,
              expectError: true,
            },
          },
          { action: 'admin.navigate.goToAdminPage' },
          { action: 'admin.navigate.selectMerchant', params: { merchantName, merchantId } },
          { action: 'admin.orders.goToOrder', params: { merchantId: merchantId } },
          {
            action: 'admin.orders.assertSplitTrackingPathName',
            params: { pathNames: ['route_a', 'route_b'] },
            stepName: 'Order Detail shows one of the configured split paths and its weight',
          },
        ],
      });
    }
  );
});
