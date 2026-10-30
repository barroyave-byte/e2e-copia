import { Page, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { DaviplataFormPage } from '@pages/explore/forms/daviplataFormPage';
import { daviplataPurchaseInterceptSuccess } from '@support/interfaces/orders/daviplataPurchaseIntercept';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const email = EmailGenerator.generateRegisteredUserEmail();

interface GlobalSetupParams {
  configurations?: (merchantId: string, merchantToken: string) => Promise<any> | void;
}

interface Run {
  page: Page;
  onFillDocumentNumber?: () => Promise<void> | void;
  asserts?: {
    documentNumberToBeVisible?: () => Promise<void> | void;
  };
}

export class DaviplataPaymentFlowUntilOTP {
  /** Tokenized in `globalSetup`, read back in `testSetup`. */
  private orderToken!: string;
  /** Set in `globalSetup`, read back in `testSetup`, same as `orderToken`. */
  private privateKey!: string;
  private publicKey!: string;

  globalSetup(params?: GlobalSetupParams) {
    test.beforeAll(async () => {
      const merchantSetup = await configMerchantCheckout.basicSetup('CO');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.daviplataProcessor,
        merchantId,
        merchantToken
      );

      const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
      this.orderToken = (await emaService.tokenizeDeunaNowOrder('CO', this.privateKey)).data.token;

      await params?.configurations?.(merchantId, merchantToken);
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

  run = async ({ page, onFillDocumentNumber, asserts }: Run) => {
    const formsPage = new FormsPage(page);
    const daviplataFormPage = new DaviplataFormPage(page);

    await test.step('Select Daviplata processor and Click on embed payment button', async () => {
      await formsPage.selectProcessorToEmbed('daviplata');
      await daviplataFormPage.scrollIntoPaymentEmbedIframe();
      const assertDocumentToBeVisible =
        asserts?.documentNumberToBeVisible || daviplataFormPage.assertDocumentNumberToBeVisible;
      await assertDocumentToBeVisible();
    });

    await test.step('Fill CC Document & purchase click', async () => {
      const fillDocument = onFillDocumentNumber || daviplataFormPage.fillDocumentNumber;
      await fillDocument();
      await page.waitForTimeout(2000);
      await daviplataFormPage.clickOnPay({
        interceptorRequest: { status: 200, body: daviplataPurchaseInterceptSuccess },
      });
    });

    await test.step('Validate waiting OTP response purchase and validate label OTP', async () => {
      await daviplataFormPage.assertWaitingOTPPurchaseResponse();
      await page.waitForTimeout(1000);
    });

    return { daviplataFormPage };
  };
}
