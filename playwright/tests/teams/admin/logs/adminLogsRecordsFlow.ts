import envConfig, { allowedEnvironments } from '@support/envConfig';
import type { FlowSteps } from 'playwright/framework/core';
import { MERCHANT_V3, MERCHANT_V3_STG } from '@pages/admin/constants/rolesAndPermissions';

const isStaging = envConfig.NODE_ENV === allowedEnvironments.STAGING;
const merchantWithAuditHistory = isStaging
  ? '7bb0d12a-e20d-4e70-8a97-125f933aa1a2'
  : '47532843-b33e-4401-8ac1-39e0808a080b';
export const merchantForAuditRole = isStaging ? MERCHANT_V3_STG : MERCHANT_V3;

export class AdminLogsRecordsFlow {
  flowSteps(merchantId = merchantWithAuditHistory): FlowSteps {
    return [
      {
        action: 'admin.navigate.goToAdminPage',
        stepName: 'Open the admin with the authenticated session',
      },
      {
        action: 'admin.auth.setMerchantSession',
        params: { merchantId },
        stepName: 'Select the merchant that has audit-log history',
      },
      {
        action: 'admin.logs.goToRecords',
        stepName: 'Navigate to Logs and land on the Records tab',
      },
    ];
  }
}

export const adminLogsRecordsFlow = new AdminLogsRecordsFlow();
