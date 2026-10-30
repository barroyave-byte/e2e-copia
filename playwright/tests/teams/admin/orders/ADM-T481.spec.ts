import { test } from '@support/fixtures';
import { FilterOrderbyEmail } from './share/filterOrderByEmail';

const filterOrderByEmail = new FilterOrderbyEmail();

test.describe('@ADM-T481 Filter orders by email', () => {
  filterOrderByEmail.globalSetup();

  test(
    '@ADM-T481 Filtrar ordenes  correo',
    { tag: ['@regression', '@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      await filterOrderByEmail.run({ page });
    }
  );
});
