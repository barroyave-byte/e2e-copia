import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';
import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { faker } from '@faker-js/faker';

const reportTypes = [
  {
    reportType: 'subscriptions',
    expectedType: /suscripci[oó]n|subscription/i,
    applyPlanFilters: false,
  },
  {
    reportType: 'subscription_plans',
    expectedType: /plan/i,
    applyPlanFilters: true,
  },
  {
    reportType: 'subscription_invoices',
    expectedType: /[oó]rdenes de suscripci[oó]n|subscription orders/i,
    applyPlanFilters: false,
  },
] as const;

test.describe('@regression Export reports from Subscriptions', () => {
  const merchantId = getDefaultMerchant();
  let merchantToken: string;

  test.beforeAll(async ({ merchantAuthService }) => {
    merchantToken = (await merchantAuthService.merchantLogin()).token;
  });

  reportTypes.forEach(({ reportType, expectedType, applyPlanFilters }) => {
    test(
      `@ADM-T913 Export a ${reportType} report and verify it in Downloads`,
      { tag: ['@admin', '@admin-preprod', '@team_admin'] },
      async ({ page, subscriptionService }) => {
        const fileName = `adm_T913_${reportType}_${faker.string.alphanumeric(10)}`;
        let planId: string = '';

        if (applyPlanFilters) {
          planId = await subscriptionService.getFirstActivePlanId(merchantId, merchantToken);
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            { action: 'admin.navigate.goToAdminPage' },
            { action: 'admin.auth.setMerchantSession', params: { merchantId } },
            { action: 'admin.navigate.goToSubscriptions' },
            {
              stepName: `Configure the ${reportType} export`,
              action: 'admin.subscriptions.openExport',
              params: { reportName: fileName },
            },
            {
              action: 'admin.subscriptions.chooseReportType',
              params: { reportType, merchantId },
            },
            {
              action: 'admin.subscriptions.assertColumnsSelectorVisible',
              params: { reportType },
            },
            {
              action: 'admin.subscriptions.assertExportButtonEnabled',
              params: { reportType },
            },
            ...(applyPlanFilters
              ? ([
                  { action: 'admin.subscriptions.selectActiveStatus' },
                  { action: 'admin.subscriptions.fillPlanId', params: { planId } },
                ] as const)
              : []),
            {
              action: 'admin.subscriptions.selectCreatedAtRange',
              params: { startDate: yesterday, endDate: today },
            },
            { action: 'admin.subscriptions.selectAllColumns' },
            {
              stepName: `Submit the ${reportType} export and assert the accepted request`,
              action: 'admin.subscriptions.submitExport',
              params: { reportType, applyPlanFilters, planId },
            },
            {
              stepName: 'Verify the Downloads entry and the report details',
              action: 'admin.reports.assertTitleVisible',
            },
            {
              action: 'admin.reports.openReportDetails',
              params: { fileName },
            },
            {
              action: 'admin.reports.assertOriginText',
              params: { expected: /Suscripciones|Subscriptions|Assinaturas/ },
            },
            {
              action: 'admin.reports.assertTypeText',
              params: { expected: expectedType, reportType },
            },
            ...(applyPlanFilters
              ? ([
                  { action: 'admin.reports.assertFiltersContainPlanId', params: { planId } },
                  { action: 'admin.reports.assertFiltersContainActiveStatus' },
                ] as const)
              : []),
            { action: 'admin.reports.assertColumnsVisible' },
            {
              action: 'admin.reports.assertSelectedColumnsCountAtLeast',
              params: { minimum: 3 },
            },
          ],
        });
      }
    );
  });
});
