import { Page, test } from '@deuna/test';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { MercadoPagoWalletProcessor } from '@support/interfaces/payment_processors';

interface MPWalletOptions {
  excludedPaymentMethods?: string[];
}

export async function configureMercadoPagoWallet(
  page: Page,
  processorConfig: MercadoPagoWalletProcessor,
  merchantId: string
) {
  const adminLoginPage = new AdminLoginPage(page);
  const adminHomePage = new AdminHomePage(page);
  const adminConnectionsPage = new AdminConnectionsPage(page);

  await test.step('The user opens the admin page and set merchant id session', async () => {
    await adminLoginPage.gotoAdmin();
    await adminHomePage.setMerchantIdSessionStorage(merchantId);
  });

  await test.step('The user goes to connections', async () => {
    await adminHomePage.goToConnections();
  });

  await test.step('The user configure MercadoPago Wallet connection', async () => {
    await adminConnectionsPage.configureConnection(
      ConnectionsAvailable.mercadopagoWallet,
      processorConfig
    );
  });
}
