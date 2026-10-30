import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import { adminLogsRecordsFlow, merchantForAuditRole } from './adminLogsRecordsFlow';
import { randomUUID } from 'node:crypto';

const auditEvent = {
  section: 'USERS',
  action: 'users.role.updated',
  severity: 'MEDIUM',
  result: 'SUCCESS',
};

/** Generates its own audited role update instead of relying on shared log history. */
test.describe('@regression Admin audit logs: search and filter records', () => {
  test(
    '@ADM-T888 Admin - Audit Logs - Search and filter records by section, action, severity and result',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const merchant = merchantForAuditRole;
      const roleName = `ADM T888 ${randomUUID().slice(0, 8)}`;
      const testing = new TestingFramework({ page, test });
      await testing.run({
        step: [
          {
            action: 'admin.roles.createAndUpdateRolePermissions',
            params: { merchantId: merchant.id, merchantName: merchant.name, roleName },
            stepName: 'Create and update a role to generate a deterministic audit event',
          },
          ...adminLogsRecordsFlow.flowSteps(merchant.id),
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the unfiltered records list has records',
          },
          {
            action: 'admin.logs.getMatchingRecordExecutedBy',
            params: auditEvent,
            saveAs: 'executedByTerm',
            stepName: 'Read the actor from the generated role update audit event',
          },
          {
            action: 'admin.logs.searchRecords',
            params: { term: ref('executedByTerm') },
            stepName: 'Type that value into the search input',
          },
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the table still shows matching records after the search debounce',
          },
          {
            action: 'admin.logs.assertAdvancedFiltersAvailable',
            stepName: 'Verify Section, Action, Severity and Result are available',
          },
          {
            action: 'admin.logs.enableAdvancedFilter',
            params: { filter: 'section' },
            stepName: 'Reveal the Section advanced filter via the "Agregar filtro" picker',
          },
          {
            action: 'admin.logs.selectSectionFilterOption',
            params: { section: 'USERS' },
            stepName: 'Select the Users option in the Section filter',
          },
          {
            action: 'admin.logs.enableAdvancedFilter',
            params: { filter: 'action' },
            stepName: 'Reveal the Action advanced filter',
          },
          {
            action: 'admin.logs.selectActionFilterOption',
            params: { action: auditEvent.action },
            stepName: 'Select the role updated action',
          },
          {
            action: 'admin.logs.enableAdvancedFilter',
            params: { filter: 'severity' },
            stepName: 'Reveal the Severity advanced filter',
          },
          {
            action: 'admin.logs.selectSeverityFilterOption',
            params: { severity: 'MEDIUM' },
            stepName: 'Select Medium and verify every returned record matches Users and Medium',
          },
          {
            action: 'admin.logs.enableAdvancedFilter',
            params: { filter: 'result' },
            stepName: 'Reveal the Result advanced filter',
          },
          {
            action: 'admin.logs.selectResultFilterOption',
            params: { result: auditEvent.result },
            stepName: 'Select Success and verify the generated event remains visible',
          },
          {
            action: 'admin.logs.clearAllFilters',
            stepName: 'Clear all filters back to the default state',
          },
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the unfiltered record set is shown again after clearing filters',
          },
        ],
        cleanup: [
          {
            action: 'admin.roles.deleteRole',
            params: { roleName },
            stepName: 'Delete the temporary role',
          },
        ],
      });
    }
  );
});
