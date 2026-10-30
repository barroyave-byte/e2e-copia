import { test } from '@support/fixtures';
import { FilterOrderbyEmail } from './share/filterOrderByEmail';

const filterOrderByEmail = new FilterOrderbyEmail();

test.describe('@ADM-T482 Filter orders by random uppercase email', () => {
  filterOrderByEmail.globalSetup();

  test(
    '@ADM-T482 Filtrar ordenes  correo con random uppercase',
    { tag: ['@regression', '@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      await filterOrderByEmail.run({ page });
    }
  );
});
