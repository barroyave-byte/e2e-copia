import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { VolarisReferenceProcessor } from '@support/interfaces/payment_processors';
import { Page } from '@support/fixtures';
import { test } from '@support/fixtures';

export async function configureVolarisReference(
  page: Page,
  processorConfig: VolarisReferenceProcessor,
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

  await test.step('The user configure Volaris Reference connection', async () => {
    await adminConnectionsPage.configureConnection(
      ConnectionsAvailable.volarisReference,
      processorConfig
    );
  });
}
