import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from '@tests/api_navitaire/common';
import { expect, test } from '@support/fixtures';

test.describe('@regression Navitaire', () => {
  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  test(
    '@PLAT-T1609 Should return error on missing fields',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      let navitaireMerchant: NavitaireCredentials;

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

      await test.step('Execute authorize with no amount', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: generatePaymentId(),
          confirmationId: generateConfirmationId(),
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '',
          currencyCode: 'MXN',
        });

        let authorizeResult = getAuthorizeResult(response.data);
        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'NMS-2001: [Invalid input]'
        );
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'failed to validate t.PaymentMethod'
        );
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'field t.Amount is required'
        );
        expect(authorizeResult.PaymentProcessingResult).toBe('Error');
      });

      await test.step('Execute authorize with no currency', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: generatePaymentId(),
          confirmationId: generateConfirmationId(),
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: '',
        });

        let authorizeResult = getAuthorizeResult(response.data);
        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain('EMA-1002');
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'order.currency is required'
        );
        expect(authorizeResult.PaymentProcessingResult).toBe('Declined');
        expect(authorizeResult.ResponseMessage).toContain('NMS-1001');
        expect(authorizeResult.ResponseMessage).toContain('cannot authorize payment');
      });
    }
  );
});
