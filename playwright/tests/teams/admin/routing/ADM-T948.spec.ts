import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const RULE_NAME = 'Regla_Test_Metadata_1';

test.describe('@regression Estrategias: crear regla específica con condición de metadata numérica y cascadeo a procesador de pago', () => {
  test(
    '@ADM-T948 Crear regla específica con condición de metadata numérica y cascadeo a procesador de pago',
    { tag: ['@routing', '@estrategias', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            params: { country: 'MX' },
            stepName:
              'Iniciar sesión en el proyecto Admin con las credenciales de developer y navegar al dashboard',
          },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.kushkiProcessor },
            stepName: 'Configurar el procesador de pago Kushki para el merchant',
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Navegar al dashboard del Admin ya logueado',
          },
          {
            action: 'admin.navigate.goToRouting',
            stepName: 'Hacer clic en "Estrategias" en el menú lateral izquierdo',
          },
          {
            action: 'admin.routing.skipRoutingTourIfShown',
            stepName: 'Omitir el tour de bienvenida de Estrategias si aparece',
          },
          {
            action: 'admin.routing.createSpecificRule',
            stepName: 'Hacer clic en el botón "Crear regla específica"',
          },
          {
            action: 'admin.routing.firstStepSpecificRule',
            params: { ruleName: RULE_NAME },
            stepName: 'Completar el nombre de la regla',
          },
          {
            action: 'admin.routing.addConditionStepSpecificRule',
            stepName: 'Agregar una condición de metadata',
          },
          {
            action: 'admin.routing.addConditionMetadata',
            params: {
              variableName: 'test1',
              formatType: 'number',
              operator: 'eq',
              value: '3',
            },
            stepName: 'Configurar metadata: nombre=test1, tipo=numérico, valor=3',
          },
          {
            action: 'admin.routing.nextStepRouting',
            stepName: 'Avanzar al paso de configuración de ruteo',
          },
          {
            action: 'admin.routing.selectDefaultPaymentEngine',
            params: { pspEngine: ConnectionsAvailable.kushki },
            stepName: 'Configurar el cascadeo al procesador de pago Kushki',
          },
          {
            action: 'admin.routing.saveRule',
            stepName: 'Confirmar y guardar la regla',
          },
          {
            action: 'admin.routing.validateCustomRuleCreated',
            params: { ruleName: RULE_NAME },
            stepName: 'Verificar que la regla aparece en la tabla de estrategias',
          },
        ],
      });
    }
  );
});
