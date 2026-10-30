import { faker } from '@faker-js/faker';
import { ACTIONS, RESOURCES } from '@pages/admin/constants/rolesAndPermissions';

export const MERCHANT_USER_PERMISSIONS: string[] = [
  ACTIONS.disableUser,
  ACTIONS.createRole,
  ACTIONS.editVoucher,
  ACTIONS.editBatchProcessing,
  RESOURCES.errorManagement,
  ACTIONS.scheduleReport,
  ACTIONS.editUser,
  ACTIONS.editErrorManagement,
  RESOURCES.paymentLink,
  ACTIONS.enableUser,
  RESOURCES.commercePaymentsConfigTab,
  ACTIONS.downloadReports,
  RESOURCES.commerce,
  ACTIONS.exportAdhocReports,
  ACTIONS.editPaymentOperations,
  RESOURCES.orders,
  RESOURCES.rolesAndPermissions,
  ACTIONS.createUser,
  ACTIONS.createUserWithRole,
  ACTIONS.createUserWithCustomPermissions,
  RESOURCES.checkoutConfig,
  ACTIONS.editInstallments,
  RESOURCES.reports,
  ACTIONS.editCommerceConfig,
  RESOURCES.connections,
  RESOURCES.commerceVoucherTab,
  ACTIONS.editRole,
  ACTIONS.editCheckoutConfig,
  ACTIONS.editConnections,
  RESOURCES.batchProcessing,
  RESOURCES.metrics,
  RESOURCES.installments,
  RESOURCES.metricsReconciliations,
  RESOURCES.routing,
  ACTIONS.editFraudConditions,
  ACTIONS.deleteRole,
  ACTIONS.editRouting,
  ACTIONS.editPaymentLink,
  ACTIONS.createUserWithRole,
  ACTIONS.createUserWithCustomPermissions,
  ACTIONS.editManage2faPolicy,
  RESOURCES.commerceSecurityTab,
  ACTIONS.reset2fa,
  RESOURCES.notifications,
];

export function generateRandomMerchantEmail(): string {
  const base = Math.random().toString(36).substring(2, 8);
  const number = Math.floor(Math.random() * 9000) + 1000;
  const suffix = Math.random().toString(36).substring(2, 5);
  return `${base}${number}${suffix}@exampledeuna.com`;
}

const PHONE_MAX_LENGTH = 20;

export function generateMerchantUserPhone(): string {
  return faker.phone.number({ style: 'international' }).slice(0, PHONE_MAX_LENGTH);
}

export function buildMerchantsWithPermissions(
  merchantIds: string[]
): Array<{ merchant_id: string; permissions: string[] }> {
  return merchantIds.map((id) => ({
    merchant_id: id,
    permissions: MERCHANT_USER_PERMISSIONS,
  }));
}

export function buildMerchantUserWithNetworkBody(
  role: string,
  storeCode: string,
  merchantIds: string[],
  networkId: string
) {
  return {
    email: generateRandomMerchantEmail(),
    password: '123456',
    name: faker.person.fullName(),
    role,
    store_code: storeCode,
    merchants_ids: merchantIds,
    network_id: networkId,
    phone: generateMerchantUserPhone(),
    allowed_actions: {
      network_id: networkId,
      environments: ['sandbox', 'production'],
      merchants: buildMerchantsWithPermissions(merchantIds),
    },
  };
}

export function buildMerchantUserWithoutNetworkBody(
  role: string,
  storeCode: string,
  merchantId: string
) {
  return {
    email: generateRandomMerchantEmail(),
    name: faker.person.fullName(),
    password: '123456',
    role,
    store_code: storeCode,
    merchants_ids: [merchantId],
    phone: generateMerchantUserPhone(),
    allowed_actions: {
      environments: ['sandbox', 'production'],
      merchants: buildMerchantsWithPermissions([merchantId]),
    },
  };
}

export function buildMerchantRoleBody(
  roleName: string,
  merchantIds: string[],
  networkId: string,
  environments: string[]
) {
  return {
    role_name: roleName,
    network_id: networkId,
    environments,
    merchants: buildMerchantsWithPermissions(merchantIds),
  };
}
