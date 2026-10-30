import { test, expect, Page } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { NequiPushFormPage } from '@pages/explore/forms/nequiPushFormPage';
import { InterceptorRequest } from '@pages/explore/forms/formHelpers';
import { getOrderSuccessResponse } from '@tests/PSP/nequi/push/share/order/success';
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
    };
  };
}

interface GlobalSetupParams {
  configurations?: () => Promise<any> | void;
}

export class NequiPushPaymentFlowUntilPhoneVerificationWithConfigurations {
  /** Tokenized in `globalSetup`, read back in `testSetup`. */
  private orderToken!: string;
  /** Set in `globalSetup`, read back in `testSetup`, same as `orderToken`. */
  private privateKey!: string;
  private publicKey!: string;

  configurations;
  theme_config;
  nequiPushFormPage: NequiPushFormPage;
  page: Page;

  globalSetup(params?: GlobalSetupParams) {
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

      this.configurations = await params?.configurations?.();
      if (this.configurations) {
        this.theme_config = JSON.parse(
          this.configurations.configurationV2.elements_config.theme_config[0].config
        );
      }
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

  getPaymentMethodsPattern() {
    return this.theme_config.PaymentMethodsPattern.translations.es;
  }

  async getInputPhoneNumber() {
    const PaymentMethodsPattern = this.getPaymentMethodsPattern();
    return this.page
      .locator(
        `#phone-selector-${PaymentMethodsPattern.nequi_push_content.phone_placeholder.replace(
          / /g,
          '\\ '
        )}`
      )
      .or(this.page.locator('input[type="tel"]'));
  }

  async fillPhoneNumber(phone: string = '3166225619') {
    const inputPhoneNumber = await this.getInputPhoneNumber();
    await this.nequiPushFormPage.fillAndVerifyValue(
      this.nequiPushFormPage.iframeLocator(inputPhoneNumber),
      phone,
      {
        withoutSpaces: true,
      }
    );
  }

  run = async ({ page, options }: Run) => {
    this.page = page;
    const formsPage = new FormsPage(page);
    const nequiPushFormPage = new NequiPushFormPage(page);
    this.nequiPushFormPage = nequiPushFormPage;

    await test.step('Select NequiPush processor and assert phone number visibility', async () => {
      await formsPage.selectProcessorToEmbed('nequiPush');
      await nequiPushFormPage.scrollIntoPaymentEmbedIframe();
      const inputPhoneNumber = await this.getInputPhoneNumber();
      await expect(nequiPushFormPage.iframeLocator(inputPhoneNumber)).toBeVisible();
    });

    await test.step('Fill phone number and wait', async () => {
      await this.fillPhoneNumber();
      await page.waitForTimeout(1000);
    });

    await test.step('Click on embed payment button and assert success response', async () => {
      const modifiedResponse = {
        error: null,
        order: getOrderSuccessResponse(),
      };

      options?.interceptors?.verify &&
        nequiPushFormPage.interceptVerifyResponse({
          body: options.interceptors.verify.body,
        });

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
