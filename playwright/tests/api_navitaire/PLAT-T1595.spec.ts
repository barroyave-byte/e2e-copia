import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { createNavitaireMerchant, NavitaireCredentials } from './common';
import { expect, test } from '@support/fixtures';
import { generateConfirmationId, generatePaymentId, getAuthorizeResult } from './common';

test.describe('@regression Unsuccessful AuthorizeRequest, missing parameters', () => {
  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  test(
    '@PLAT-T1595 Should fail to authenticate request with missing required attributes',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
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

      await test.step('Should create order unsuccessfully on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessfulFraudReprove.number,
          userEmail: '', // explicit blank email to trigger error
          installments: '6',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);
      });

      await test.step('Should convert EMA failure to Navitaire format', async () => {
        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain('EMA-6018');
        expect(authorizeResult.PaymentProcessingResult).toContain('Declined');
        expect(authorizeResult.ResponseMessage).toContain('NMS-1001');
        expect(authorizeResult.ResponseMessage).toContain(
          'cannot create user token, payer_info.email not provided'
        );
      });
    }
  );
});
