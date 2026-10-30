import { expect, Page } from '@playwright/test';

interface RemoteTranslationsParams {
  projectName: string;
  lang: 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh';
}

export class RemoteTranslations {
  responseRemoteTranslations: any;

  constructor(private readonly page: Page) {}

  waitResponseFromRemoteTranslations(params: RemoteTranslationsParams) {
    this.responseRemoteTranslations = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/translations/${params.lang}/${params.projectName}`) &&
        response.request().method() === 'GET',
      { timeout: 30000 }
    );
  }

  async assertRemoteTranslations() {
    const responseRemoteTranslations = await this.responseRemoteTranslations;
    const responseRemoteTranslationsBody = await responseRemoteTranslations.json();
    // must be a non empty object
    expect(responseRemoteTranslationsBody).not.toBeNull();
    expect(Object.keys(responseRemoteTranslationsBody).length).toBeGreaterThan(0);
  }
}
