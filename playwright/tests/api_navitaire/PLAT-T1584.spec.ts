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
} from './common';
import { expect, test } from '@support/fixtures';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  let navitaireMerchant: NavitaireCredentials;

  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  test(
    '@PLAT-T1584 | Should authenticate request with valid Username and Password',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ navitaireService }) => {
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();

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

      await test.step('Should authenticate request with valid Username and Password', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaFailed.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });

        const authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.ValidationFailureReason).not.toContain('NMS-2002');
        expect(authorizeResult.ValidationResult.ValidationFailureReason).not.toContain(
          'invalid credentials'
        );
        expect(authorizeResult.ResponseMessage).not.toContain('NMS-2002');
        expect(authorizeResult.ResponseMessage).not.toContain('invalid credentials');
      });
    }
  );
});
