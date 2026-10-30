import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const RULE_NAME = 'regla-sin-condicion';

test.describe('@regression Estrategias: crear regla específica sin condiciones y verificar error de validación', () => {
  test(
    '@ADM-T952 Crear regla específica sin condiciones y verificar error de validación',
    { tag: ['@routing', '@estrategias', '@validacion', '@team_admin'] },
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
            stepName: 'Navegar a la sección de Estrategias en el menú lateral izquierdo',
          },
          {
            action: 'admin.routing.skipRoutingTourIfShown',
            stepName: 'Omitir el tour de bienvenida de Estrategias si aparece',
          },
          {
            action: 'admin.routing.createSpecificRule',
            stepName: 'Dar click al botón de crear regla específica',
          },
          {
            action: 'admin.routing.firstStepSpecificRule',
            params: { ruleName: RULE_NAME },
            stepName: 'Ingresar un nombre para la regla',
          },
          {
            action: 'admin.routing.addConditionStepSpecificRule',
            stepName: 'Avanzar al paso de condiciones sin agregar ninguna condición',
          },
          {
            action: 'admin.routing.nextStepRouting',
            stepName: 'Avanzar al paso de configuración de ruteo sin condiciones',
          },
          {
            action: 'admin.routing.selectDefaultPaymentEngine',
            params: { pspEngine: ConnectionsAvailable.kushki },
            stepName: 'Configurar el procesador de cascadeo Kushki',
          },
          {
            action: 'admin.routing.assertSaveBlockedWithNoConditions',
            stepName:
              'Verificar que el botón de activar permanece deshabilitado por falta de condiciones',
          },
        ],
      });
    }
  );
});
