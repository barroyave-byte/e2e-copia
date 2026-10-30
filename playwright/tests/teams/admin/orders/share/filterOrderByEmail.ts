import { Page, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
let userEmail: string;

interface RunArgs {
  page: Page;
  options?: {
    useRandomCase?: boolean;
  };
}

export class FilterOrderbyEmail {
  private merchantId: string;
  private privateKey: string;
  private merchantName: string;

  private randomizeCase(email: string) {
    return email.replace(/[a-zA-Z]/g, (char) =>
      Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()
    );
  }

  private async createOrder() {
    const email = `${crypto.randomUUID()}@testuser.com`;

    const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
    const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', this.privateKey, {
      user_email: email,
    });
    const orderToken = tokenizeResult.data.token;

    const guestLoginResult = await userAuthService.loginAsGuest(this.merchantId, this.privateKey);
    await paymentService.purchase(this.privateKey, guestLoginResult.data.token, {
      token: orderToken,
      email,
      processor_name: 'kushki',
      method_type: 'credit_card',
      store_code: 'all',
      credit_card: {
        card_holder_dni: '12345678',
        expiry_month: '11',
        expiry_year: '2027',
        card_holder: 'APRO',
        card_number: creditCardData.kushkiVisaSuccessfull.number,
        card_cvv: creditCardData.kushkiVisaSuccessfull.cvv_code,
        address1: 'Santo Domingo 1',
        address2: '',
        zip: '1215',
        city: 'Santo Domingo',
        state: 'Distrito Nacional',
        country: 'CL',
        phone: '12345755',
      },
    } as any);

    return email;
  }

  private async createOrders(limit: number = 5) {
    for (let i = 0; i < limit; i++) {
      userEmail = await this.createOrder();
    }
  }

  globalSetup() {
    test.beforeAll(async () => {
      const { merchantId, privateKey, merchantName, merchantToken } =
        await configMerchant.basicSetup('MX');
      this.merchantId = merchantId;
      this.merchantName = merchantName;
      this.privateKey = privateKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      await this.createOrders();
    });
  }

  run = async ({ page, options = {} }: RunArgs) => {
    const adminHomePage = new AdminHomePage(page);
    const adminLoginPage = new AdminLoginPage(page);
    const adminOrdersPage = new AdminOrdersPage(page);

    await test.step('User logs into Admin and sets merchant session', async () => {
      await adminLoginPage.gotoAdmin();
      await adminHomePage.selectMerchant(this.merchantName, this.merchantId);
    });

    await test.step('User goes to Orders view in Admin', async () => {
      await adminHomePage.goToOrders();
      await adminOrdersPage.assertPresenceInOrdersView();
    });

    await test.step('User searches the order by Email', async () => {
      if (options.useRandomCase) {
        const emailToRandomCase = this.randomizeCase(userEmail);
        await adminOrdersPage.searchOrderByEmailWithRandomCase(emailToRandomCase, userEmail);
      } else {
        await adminOrdersPage.searchOrderByEmail(userEmail);
      }

      console.log(`Searching order with Email: ${userEmail}`);
      await adminOrdersPage.assertFilterNotDisplayLabelNotAvailableInfo();
      await adminOrdersPage.assertOrderFoundByEmail(userEmail);
    });

    await test.step('Clear filters after Email search', async () => {
      await adminOrdersPage.clickClearFilters();
    });
  };
}
