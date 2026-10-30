import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  createNavitaireMerchant,
  getAuthorizeResult,
  skipCheckTraceLogs,
  skipCheckTraceLogsMsg,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';

test.describe('@regression Unsuccessful purchase using APM', () => {
  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  test(
    '@PLAT-T1601 Should fail to create an order due to lack of order_id',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      let navitaireMerchant: NavitaireCredentials;
      let authorizeResult: any;

      await test.step('Should create a new merchant on DEUNA configured with Stripe and able to make purchase v2 without user token', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripeProcessor,
          merchantId,
          merchantToken
        );
        await apiCallNewman.createNetwork(merchantId, merchantToken);
      });

      await test.step('Should create a new merchant on navitaire middleware', async () => {
        navitaireMerchant = await createNavitaireMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should create order correctly on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: '', // intentionally left blank to trigger validation error
          confirmationId: '', // intentionally left blank to trigger validation error
          paymentMethod: 'GenericPaymentMethod',
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toBe(
          'EMA-1002: order.order_id is required'
        );
        expect(authorizeResult.PaymentProcessingResult).toBe('Declined');
      });

      await test.step('Should validate error code is being returned as property bag', async (step) => {
        step.skip(skipCheckTraceLogs(), skipCheckTraceLogsMsg);

        const errorCode = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'external_error_code'
        )?.Value;
        expect(errorCode).toBe('EMA-1002');
      });
    }
  );
});
