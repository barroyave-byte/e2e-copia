import { test, Page } from '@support/fixtures';

import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { NequiPushFormPage } from '@pages/explore/forms/nequiPushFormPage';
import { InterceptorRequest } from '@pages/explore/forms/formHelpers';
import { getOrderSuccessResponse } from './order/success';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const email = EmailGenerator.generateRegisteredUserEmail();

interface Run {
  page: Page;
  options?: {
    interceptors: {
      verify?: {
        body: InterceptorRequest['body'];
      };
      verifyWebhook?: {
        pendingBody: InterceptorRequest['body'];
        successBody: InterceptorRequest['body'];
      };
    };
    timesToVerify?: number;
  };
}

export class NequiPushPaymentFlowUntilPhoneVerification {
  /** Tokenized in `globalSetup`, read back in `testSetup`. */
  private orderToken!: string;
  /** Set in `globalSetup`, read back in `testSetup`, same as `orderToken`. */
  private privateKey!: string;
  private publicKey!: string;

  globalSetup() {
    test.beforeAll(async () => {
      const merchantSetup = await configMerchantCheckout.basicSetup('CO');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nequiPushProcessor,
        merchantId,
        merchantToken
      );

      const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
      this.orderToken = (await emaService.tokenizeDeunaNowOrder('CO', this.privateKey)).data.token;
    });
  }

  testSetup() {
    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: this.orderToken,
          merchantCredentials: { publicKey: this.publicKey, privateKey: this.privateKey },
        });
      }
    );
  }

  run = async ({ page, options }: Run) => {
    const formsPage = new FormsPage(page);
    const nequiPushFormPage = new NequiPushFormPage(page);

    await test.step('Select NequiPush processor and assert phone number visibility', async () => {
      await formsPage.selectProcessorToEmbed('nequiPush');
      await nequiPushFormPage.scrollIntoPaymentEmbedIframe();
      await nequiPushFormPage.assertPhoneNumberToBeVisible();
    });

    await test.step('Fill phone number and wait', async () => {
      await nequiPushFormPage.fillPhoneNumber();
      await page.waitForTimeout(1000);
    });

    await test.step('Click on embed payment button and assert success response', async () => {
      const modifiedResponse = {
        error: null,
        order: getOrderSuccessResponse(),
      };

      if (options?.interceptors?.verifyWebhook) {
        await nequiPushFormPage.interceptVerifyWebhookFlow(
          options.interceptors.verifyWebhook.pendingBody,
          options.interceptors.verifyWebhook.successBody
        );
        await nequiPushFormPage.waitForNequiPushVerifySucceededResponse();
      } else {
        options?.interceptors?.verify &&
          nequiPushFormPage.interceptVerifyResponse(
            {
              body: options.interceptors.verify.body,
            },
            options.timesToVerify
          );
        await nequiPushFormPage.waitForNequiPushVerifyResponse();
      }

      await nequiPushFormPage.clickOnPay({
        interceptorRequest: { body: modifiedResponse, status: 200 },
      });
      await nequiPushFormPage.assertSuccessPurchaseResponse();
    });

    await test.step('Assert phone verification page visibility', async () => {
      await nequiPushFormPage.assertPhoneVerificationPageToBeVisible();
    });

    return { nequiPushFormPage };
  };
}
