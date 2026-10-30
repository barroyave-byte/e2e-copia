import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';

/**
 * Sets up the test environment for AVS tests
 * - Logs into admin
 * - Sets merchant ID in session storage
 * - Navigates to connections
 * Note: Processor should be created in beforeAll using apiCallNewman.createPaymentProcessor()
 */
export async function setupAvsTestEnvironment(
  adminLoginPage: AdminLoginPage,
  adminHomePage: AdminHomePage,
  adminConnectionsPage: AdminConnectionsPage,
  merchantId: string
): Promise<void> {
  await adminLoginPage.gotoAdmin();
  await adminHomePage.setMerchantIdSessionStorage(merchantId);
  await adminHomePage.goToConnections();
}

/**
 * Navigates to connections page and opens the processor drawer
 */
export async function navigateAndOpenProcessorDrawer(
  adminHomePage: AdminHomePage,
  adminConnectionsPage: AdminConnectionsPage
): Promise<void> {
  await adminHomePage.goToConnections();
  await adminConnectionsPage.openProcessorDrawer();
}
