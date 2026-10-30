import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import envConfig from '@support/envConfig';

const urlApi = envConfig.BASE_URL_POSTMAN;

test.describe('@regression Installments with Kushki', () => {
  test.fixme(
    '@PI-T751 Authorize installments sin shipping address',
    { annotation: { type: 'bug', description: 'PI-4986' } , tag: ['@team_payment_integration'] },
    async ({ page }) => {
      // TODO: When the bug is fixed, uncomment the following lines and use playwright/support/http for the call to the API
      /*await apiCallNewman.callPostmanCollection({
        collection: CollectionPostmanUrl.INSTALLMENTS_WITH_KUSHKI,
        folderName: 'PI-T751 Authorize installments sin shipping address',
        setPostmanGlobalVars: [
          { key: 'country_code', value: 'MX' },
          { key: 'base_url', value: urlApi },
        ],
      });*/
    }
  );
});
