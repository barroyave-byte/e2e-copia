import { test, expect } from '@support/fixtures';
import { TranslationsAdminPage } from '@pages/tranlations_admin/translations_admin_page';
import { buildTranslationPage } from './shared/buildTranslationPage';

const projectName = `test_project_${Math.floor(Math.random() * 9999999)}`;
const langEN = 'en';
const langES = 'es';

test.describe(
  '@regression Translations Admin',
  { tag: ['@checkout', '@translations_admin', '@team_enterprise', '@preprod', '@checkout_ui'] },
  () => {
    let translationsAdminPage: TranslationsAdminPage;
    let esProjectId: string;

    test.afterEach(async () => {
      // Cleanup created projects
      if (translationsAdminPage.translationsProjectId) {
        await translationsAdminPage.cleanup(translationsAdminPage.translationsProjectId);
        if (esProjectId) {
          await translationsAdminPage.cleanup(esProjectId);
        }
      }
    });

    test('@ENTP1-T2434 - Translations admin - Add new language to existing project translations', async ({
      page,
    }) => {
      // Configurar URL base específica para este test
      translationsAdminPage = buildTranslationPage(page);

      await test.step('Login & Create new translations project', async () => {
        await translationsAdminPage.init();
        await translationsAdminPage.login();

        await translationsAdminPage.createNewTranslationsProject({
          name: projectName,
          lang: langEN,
        });

        await translationsAdminPage.goToProjectDetailsPage(projectName);
      });

      await test.step('Validate duplicated project name & language', async () => {
        await translationsAdminPage.clickOnNewTranslationsProjectButton();
        await translationsAdminPage.newTranslationsProjectSelectLanguage(langEN);
        await translationsAdminPage.assertDuplicatedProjectError();
        await translationsAdminPage.newTranslationsProjectSelectLanguage(langES);
        await translationsAdminPage.assertDuplicatedProjectErrorNotVisible();
      });

      await test.step('Create new translations project with different language', async () => {
        const responsePromise =
          translationsAdminPage.getNewTranslationsProjectHttpResponsePromise();
        await translationsAdminPage.submitNewTranslationsProjectForm();
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        esProjectId = (await response.json()).id;
        await translationsAdminPage.assertLanguageTabIsVisible(langES);
      });
    });
  }
);
