import { test } from '@support/fixtures';
import { TranslationsAdminPage } from '@pages/tranlations_admin/translations_admin_page';
import { buildTranslationPage } from './shared/buildTranslationPage';

const projectName = `test_project_${Math.floor(Math.random() * 9999999)}`;
const lang = 'en';

test.describe(
  '@regression Translations Admin',
  { tag: ['@checkout', '@translations_admin', '@team_enterprise'] },
  () => {
    let translationsAdminPage: TranslationsAdminPage;

    test.afterEach(async () => {
      if (translationsAdminPage.translationsProjectId) {
        await translationsAdminPage.cleanup(translationsAdminPage.translationsProjectId);
      }
    });

    test(
      '@ENTP1-T2431 - Translations Admin - Create new translations project',
      { tag: ['@preprod', '@checkout_ui'] },
      async ({ page }) => {
        // Configurar URL base específica para este test
        translationsAdminPage = buildTranslationPage(page);

        await translationsAdminPage.init();

        await test.step('Login', async () => {
          await translationsAdminPage.login();
        });

        await test.step('Create new translations project', async () => {
          await translationsAdminPage.createNewTranslationsProject({
            name: projectName,
            lang,
            defaultJson: {
              title: 'Test Project',
              description: 'Test Project Description',
            },
          });
        });

        await test.step('Go to project details page', async () => {
          await translationsAdminPage.goToProjectDetailsPage(projectName);
        });
      }
    );
  }
);
