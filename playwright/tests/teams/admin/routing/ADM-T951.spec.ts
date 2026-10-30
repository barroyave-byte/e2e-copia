import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const RULE_NAME = 'Regla_test1';

test.describe('@regression Estrategias: filtrar reglas por metadatos y verificar resultado', () => {
  test(
    '@ADM-T951 Filtrar reglas por metadatos y verificar resultado',
    { tag: ['@routing', '@filtros', '@metadata', '@estrategias', '@team_admin'] },
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
            stepName: 'El usuario se encuentra en la sección de Estrategias',
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
            action: 'admin.routing.filterByMetadata',
            params: { key: 'test1', value: '3' },
            stepName:
              'Localizar el panel de filtros, dar click en el botón agregar filtro, seleccionar el filtro de metadata, aplicar y completar los campos: llave=test1, tipo=numérico, valor=3',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName:
              'Verificar que la regla creada con metadatos test1=3 aparece en los resultados',
          },
        ],
      });
    }
  );
});
