import { TranslationsAdminPage } from '@pages/tranlations_admin/translations_admin_page';
import envConfig from '@support/envConfig';
import { TranslationsEnvironment } from '@support/interfaces/translations_admin/interfaces';
import { Page } from '@playwright/test';

export const buildTranslationPage = (page: Page) => {
  const env = envConfig.NODE_ENV;
  const host = envConfig.TRANSLATIONS_ADMIN_URL;

  const mapper = {
    ['staging']: TranslationsEnvironment.STG,
    ['develop']: TranslationsEnvironment.DEV,
  };

  return new TranslationsAdminPage({
    page,
    host,
    env: mapper[env] ?? TranslationsEnvironment.DEV,
  });
};
