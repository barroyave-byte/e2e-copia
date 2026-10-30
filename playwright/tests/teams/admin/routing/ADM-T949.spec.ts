import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const RULE_NAME = 'Regla_test1';

test.describe('@regression Estrategias: filtrar reglas por nombre exacto (multiselect) y verificar resultado', () => {
  test(
    '@ADM-T949 Filtrar reglas por nombre exacto (multiselect) y verificar resultado',
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
            stepName: 'Navegar a la sección "Estrategias" desde el menú lateral izquierdo',
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
            stepName: 'Verificar que la regla aparece en la tabla antes de aplicar el filtro',
          },
          {
            action: 'admin.routing.reloadRoutingPage',
            stepName: 'Recargar la página para que los filtros incluyan la regla recién creada',
          },
          {
            action: 'admin.routing.filterByRuleName',
            params: { ruleName: RULE_NAME },
            stepName:
              'Localizar el campo de filtro por nombre de regla y seleccionar en el multiselect el nombre exacto de la regla creada',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName:
              'Verificar que la tabla muestra únicamente la regla cuyo nombre coincide con el valor seleccionado',
          },
        ],
      });
    }
  );
});
