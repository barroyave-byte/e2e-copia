import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const RULE_NAME = 'Regla_test1';

test.describe('@regression Estrategias: filtrar combinando nombre de regla y procesador de pago simultáneamente', () => {
  test(
    '@ADM-T953 Filtrar combinando nombre de regla y procesador de pago simultáneamente',
    { tag: ['@routing', '@filtros', '@estrategias', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            params: { country: 'MX' },
          },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.kushkiProcessor },
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
          },
          {
            action: 'admin.navigate.goToRouting',
            stepName: 'Navegar a la sección de Estrategias desde el menú lateral izquierdo',
          },
          {
            action: 'admin.routing.skipRoutingTourIfShown',
            stepName: 'Omitir el tour de bienvenida de Estrategias si aparece',
          },
          {
            action: 'admin.routing.createSpecificRule',
          },
          {
            action: 'admin.routing.firstStepSpecificRule',
            params: { ruleName: RULE_NAME },
          },
          {
            action: 'admin.routing.addConditionStepSpecificRule',
          },
          {
            action: 'admin.routing.addConditionMetadata',
            params: {
              variableName: 'test1',
              formatType: 'number',
              operator: 'eq',
              value: '3',
            },
          },
          {
            action: 'admin.routing.nextStepRouting',
          },
          {
            action: 'admin.routing.selectDefaultPaymentEngine',
            params: { pspEngine: ConnectionsAvailable.kushki },
          },
          {
            action: 'admin.routing.saveRule',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName: 'Verificar que la tabla muestra todas las reglas existentes antes de filtrar',
          },
          {
            action: 'admin.routing.reloadRoutingPage',
            stepName: 'Recargar la página para que los filtros incluyan la regla recién creada',
          },
          {
            action: 'admin.routing.filterByRuleName',
            params: { ruleName: RULE_NAME },
            stepName:
              'Aplicar el filtro de nombre de regla seleccionando el nombre exacto de la regla creada (multiselect)',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName:
              'Verificar que la tabla se actualiza mostrando únicamente las reglas que coinciden con ese nombre',
          },
          {
            action: 'admin.routing.filterByProcessor',
            params: { processorName: ConnectionsAvailable.kushki },
            stepName:
              'Sin limpiar el filtro anterior, aplicar también el filtro de procesador de pago con Kushki',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName:
              'Verificar que la regla mostrada contiene tanto el nombre filtrado como el procesador filtrado',
          },
        ],
      });
    }
  );
});
