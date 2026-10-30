import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { aplazoProcessor } from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { randomUUID } from 'crypto';
import { customStyleHideChangeMethod } from '@support/mocks/customStyleHideChangeMethod';

const elementsConfig = {
  theme_config: [
    {
      id: randomUUID(),
      name: 'theme_config',
      config: JSON.stringify(customStyleHideChangeMethod),
    },
  ],
  init_with_guest_user: false,
  user_authentication_flow: true,
};

test.describe(
  '@regression @visual Aplazo - Processing view PulsingDots',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    test(
      '@ENTP1-T2611 Aplazo Testing Visual Pulsing Dots',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page, emaService }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              params: { country: 'CO' },
            },
            {
              action: 'setup.checkout.configureV2',
              params: { elementsConfig },
            },
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: aplazoProcessor },
            },
            {
              action: 'setup.order.tokenizeOrder',
              params: {
                orderData: DeunacheckoutOrderBuilder.createBody('CO', { amount: 34200 }),
              },
            },
            {
              action: 'checkout.openCheckout',
              params: { experienceType: 'Formularios' },
            },
            { action: 'checkout.bnpl.aplazo.selectForm' },
            { action: 'checkout.bnpl.aplazo.clickPayAndWaitForPopup' },
            { action: 'checkout.bnpl.aplazo.assertPulsingDotsVisible' },
            {
              action: 'visual.verifyCheckoutIframe',
              params: {
                snapshotName: 'aplazo-processing-view-pulsing-dots',
                viewports: 'desktopAndFullscreen',
              },
            },
          ],
          cleanup: [{ action: 'checkout.bnpl.aplazo.closePopup' }],
        });
      }
    );
  }
);
