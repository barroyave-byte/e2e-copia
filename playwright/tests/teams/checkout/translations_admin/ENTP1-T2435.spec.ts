import { test, expect } from '@support/fixtures';
import { TranslationsAdminPage } from '@pages/tranlations_admin/translations_admin_page';
import { EditorMode } from '@support/interfaces/translations_admin/interfaces';
import { buildTranslationPage } from './shared/buildTranslationPage';

const projectName = `test_project_${Math.floor(Math.random() * 9999999)}`;
const langEN = 'en';

test.describe(
  '@regression Translations Admin',
  { tag: ['@checkout', '@translations_admin', '@team_enterprise', '@preprod', '@checkout_ui'] },
  () => {
    let translationsAdminPage: TranslationsAdminPage;

    test.afterEach(async () => {
      // Cleanup created projects
      if (translationsAdminPage.translationsProjectId) {
        await translationsAdminPage.cleanup(translationsAdminPage.translationsProjectId);
      }
    });

    test('@ENTP1-T2435 - Translations admin - Edit translations & restore backup', async ({
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
        await translationsAdminPage.assertSaveChangesButtonIsDisabled();
      });

      const translations = {
        invalidCvv: 'Invalid CVV',
        invalidExpiryDate: 'Invalid Expiry Date',
      };

      await test.step('Add new chunk & translations', async () => {
        await translationsAdminPage.addNewChunkWithTranslations({
          name: 'errors',
          translations,
        });
      });

      await test.step('Save first translations', async () => {
        await translationsAdminPage.assertSaveChangesButtonIsEnabled();
        await translationsAdminPage.clickOnSaveChangesButton();

        // Assert that the page is reloaded
        await translationsAdminPage.assertLanguageTabIsVisible(langEN);
      });

      await test.step('Update translations in JSON mode', async () => {
        await translationsAdminPage.clickEditorTab(EditorMode.JSON);
        await translationsAdminPage.assertCodeEditorIsVisible();

        // Update translations with invalid values (only strings are allowed)
        await translationsAdminPage.fillCodeEditorContent({
          errors: {
            ...translations,
            enabled: true,
          },
        });

        // Handle dialogs automatically for this section
        const dialogHandler = async (dialog: any) => {
          expect(dialog.type()).toBe('confirm');
          await dialog.dismiss();
        };

        page.on('dialog', dialogHandler);

        try {
          // Now try to switch tabs - this should trigger the dialog
          await translationsAdminPage.clickEditorTab(EditorMode.CHUNKS);
        } finally {
          // Always remove the handler, even if there's an error
          page.off('dialog', dialogHandler);
        }

        // Insert a valid value
        await translationsAdminPage.fillCodeEditorContent({
          errors: {
            ...translations,
            invalidCvv: 'Invalid CVV updated',
          },
        });

        await translationsAdminPage.clickEditorTab(EditorMode.CHUNKS);
      });

      await test.step('Save second translations', async () => {
        await translationsAdminPage.assertSaveChangesButtonIsEnabled();
        await translationsAdminPage.clickOnSaveChangesButton();

        // Assert that the page is reloaded
        await translationsAdminPage.assertLanguageTabIsVisible(langEN);
      });

      await test.step('Tests backup has been created', async () => {
        await translationsAdminPage.clickEditorTab(EditorMode.HISTORY);
        await translationsAdminPage.restoreBackup(0);
        await translationsAdminPage.assertLoaderTranslationsIsVisible();

        // Assert that the page is reloaded
        await translationsAdminPage.assertLanguageTabIsVisible(langEN);
        await translationsAdminPage.clickEditorTab(EditorMode.JSON);

        // Assert that the code editor content is the same as the default translations
        await translationsAdminPage.assertCodeEditorContent({
          errors: translations,
        });
      });
    });
  }
);
