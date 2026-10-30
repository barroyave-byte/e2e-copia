import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';
import {
  LoginOptions,
  NewTranslationsProjectOptions,
  NewChunkOptions,
  TranslationsEnvironment,
  EditorMode,
} from '@support/interfaces/translations_admin/interfaces';

interface ConsttructorParams {
  page: Page;
  host: string;
  env: TranslationsEnvironment;
}

export class TranslationsAdminPage extends CommonsActions {
  readonly page: Page;
  readonly host: string;
  env: TranslationsEnvironment;

  readonly selectEnvironmentLocator: Locator;
  readonly selectDevelopEnvironmentLocator: Locator;
  readonly selectStagingEnvironmentLocator: Locator;
  readonly selectProductionEnvironmentLocator: Locator;
  readonly inputEmailLocator: Locator;
  readonly inputPasswordLocator: Locator;
  readonly buttonLoginLocator: Locator;
  readonly buttonLogoutLocator: Locator;
  readonly containerAuthValidatorLocator: Locator;
  readonly buttonNewTranslationsProjectLocator: Locator;
  readonly inputNewTranslationsProjectNameLocator: Locator;
  readonly selectNewTranslationsProjectLanguageLocator: Locator;
  readonly codeEditorLocator: Locator;
  readonly codeEditorContentLocator: Locator;
  readonly buttonNewTranslationsProjectSubmitLocator: Locator;
  readonly buttonNewChunkLocator: Locator;
  readonly labelDuplicateProjectLocator: Locator;
  readonly buttonSaveChangesLocator: Locator;
  readonly buttonAddNewChunkLocator: Locator;
  readonly cardNewChunkLocator: Locator;
  readonly inputNewChunkNameLocator: Locator;
  readonly buttonNewChunkAcceptLocator: Locator;
  readonly buttonNewChunkCancelLocator: Locator;
  readonly buttonShowBackupModalLocator: Locator;
  readonly buttonRestoreBackupLocator: Locator;
  readonly loaderTranslationsLocator: Locator;

  authToken: string | undefined;
  translationsProjectId: string | undefined;

  constructor(params: ConsttructorParams) {
    super(params.page);
    this.page = params.page;
    this.host = params.host;
    this.env = params.env;

    this.selectEnvironmentLocator = this.page.locator('#select-env-trigger');
    this.selectDevelopEnvironmentLocator = this.page.locator('#select-env-dev-item');
    this.selectStagingEnvironmentLocator = this.page.locator('#select-env-stg-item');
    this.selectProductionEnvironmentLocator = this.page.locator('#select-env-prod-item');
    this.inputEmailLocator = this.page.locator('#email-input');
    this.inputPasswordLocator = this.page.locator('#password-input');
    this.buttonLoginLocator = this.page.locator('#login-button');
    this.buttonLogoutLocator = this.page.locator('#logout-button');
    this.containerAuthValidatorLocator = this.page.locator('#auth-loading');
    this.buttonNewTranslationsProjectLocator = this.page.locator('#new-project-button');
    this.inputNewTranslationsProjectNameLocator = this.page.locator('#project-name-input');
    this.selectNewTranslationsProjectLanguageLocator = this.page.locator(
      '#language-picker-trigger'
    );
    this.codeEditorLocator = this.page.locator('.cm-editor');
    this.codeEditorContentLocator = this.codeEditorLocator.locator('.cm-content');
    this.buttonNewTranslationsProjectSubmitLocator = this.page.locator('#new-project-save-button');
    this.buttonNewChunkLocator = this.page.locator('#new-chunk-button');
    this.labelDuplicateProjectLocator = this.page.locator('#duplicated-project-error');
    this.buttonSaveChangesLocator = this.page.locator('#save-changes-button');
    this.buttonAddNewChunkLocator = this.page.locator('#new-chunk-button');
    this.cardNewChunkLocator = this.page.locator('#new-chunk-card');
    this.inputNewChunkNameLocator = this.page.locator('#chunk-name-input');
    this.buttonNewChunkAcceptLocator = this.page.locator('#chunk-name-accept-button');
    this.buttonNewChunkCancelLocator = this.page.locator('#chunk-name-cancel-button');
    this.buttonShowBackupModalLocator = this.page.locator('.backup-view-button');
    this.buttonRestoreBackupLocator = this.page.locator('#backup-json-modal-restore-button');
    this.loaderTranslationsLocator = this.page.locator('#translations-fetching');
  }

  /**
   * Get chunk locators
   * NOTE: There is no way to define the locators as properties of the class
   * due to the dynamic nature of the locators
   * @param chunkName
   * @returns
   */
  getChunkLocators(chunkName: string) {
    return {
      buttonAddTranslationLocator: this.page.locator(`#${chunkName}-add-translation-button`),
      buttonSaveChunkLocator: this.page.locator(`#${chunkName}-save-new-chunk-button`),
    };
  }

  /**
   * Get translation form locators
   * NOTE: There is no way to define the locators as properties of the class
   * due to the dynamic nature of the locators
   * @param chunkName
   * @returns
   */
  getTranslationFormLocators(chunkName: string) {
    return {
      inputKeyLocator: this.page.locator(`#${chunkName}-translation-key-input`),
      inputValueLocator: this.page.locator(`#${chunkName}-translation-value-input`),
      buttonSaveLocator: this.page.locator(`#${chunkName}-translation-save-button`),
      buttonCancelLocator: this.page.locator(`#${chunkName}-translation-cancel-button`),
      labelKeyErrorLocator: this.page.locator(`#${chunkName}-translation-key-error`),
    };
  }

  async init() {
    await this.page.goto(this.host);
  }

  async selectEnvironment(env: TranslationsEnvironment) {
    this.env = env;
    await this.ensureVisibleToClick(this.selectEnvironmentLocator);
    const mapper = {
      [TranslationsEnvironment.DEV]: this.selectDevelopEnvironmentLocator,
      [TranslationsEnvironment.STG]: this.selectStagingEnvironmentLocator,
      [TranslationsEnvironment.PROD]: this.selectProductionEnvironmentLocator,
    };
    await this.ensureVisibleToClick(mapper[env]);
  }

  /**
   * Fill login form and click on submit button
   * @param loginOptions
   */
  async fillLoginFormAndSubmit(loginOptions: LoginOptions) {
    await this.selectEnvironment(loginOptions.env);

    // wait page reload
    await this.page.waitForURL(/\/login/);

    await this.inputEmailLocator.fill(loginOptions.email);
    await this.inputPasswordLocator.fill(loginOptions.password);
    await this.ensureVisibleToClick(this.buttonLoginLocator);
  }

  /**
   * Assert that user is logged in by checking logout button visibility
   */
  async assertIsLoggedIn() {
    await expect(this.buttonLogoutLocator).toBeVisible();
  }

  async clickOnNewTranslationsProjectButton() {
    await this.ensureVisibleToClick(this.buttonNewTranslationsProjectLocator);
  }

  async newTranslationsProjectSelectLanguage(lang: string) {
    await this.selectNewTranslationsProjectLanguageLocator.click();

    // NOTE: There is no way to define the locator as a property of the class
    // due to the dynamic nature of the language picker item locator
    await this.page.locator(`#language-picker-item-${lang}`).click();
  }

  async fillNewTranslationsProjectForm(
    newTranslationsProjectOptions: NewTranslationsProjectOptions
  ) {
    const { name, lang, defaultJson } = newTranslationsProjectOptions;
    await this.inputNewTranslationsProjectNameLocator.fill(name);

    // Click on language dropdown item
    await this.newTranslationsProjectSelectLanguage(lang);

    if (defaultJson) {
      await this.fillCodeEditorContent(defaultJson);
      await this.assertCodeEditorContent(defaultJson);
    }
  }

  async fillCodeEditorContent(content: Record<string, unknown>) {
    await this.codeEditorLocator.click();
    // First select all content, double click not working
    // Use platform-specific select all shortcut
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');

    await this.page.keyboard.type(JSON.stringify(content));
  }

  async assertCodeEditorContent(expectedJson: Record<string, unknown>) {
    const editorContent = await this.codeEditorContentLocator.innerText();

    // Parse the actual JSON content from the editor
    const actualJson = JSON.parse(editorContent);

    // Compare the parsed objects
    expect(JSON.stringify(actualJson)).toEqual(JSON.stringify(expectedJson));
  }

  async submitNewTranslationsProjectForm() {
    await this.ensureVisibleToClick(this.buttonNewTranslationsProjectSubmitLocator);
  }

  async assertNewTranslationsProjectHasBeenCreated(projectName: string) {
    // NOTE: There is no way to define the locator as a property of the class
    // due to the dynamic nature of the project group card locator
    await expect(this.page.locator(`#project-group-card-${projectName}`)).toBeVisible();
  }

  async assertDuplicatedProjectError() {
    await expect(this.labelDuplicateProjectLocator).toBeVisible();
  }

  async assertLoaderTranslationsIsVisible() {
    await expect(this.loaderTranslationsLocator).toBeVisible();
  }

  async assertLoaderTranslationsIsHidden() {
    await expect(this.loaderTranslationsLocator).toBeHidden();
  }

  async assertDuplicatedProjectErrorNotVisible() {
    await expect(this.labelDuplicateProjectLocator).toBeHidden();
  }

  async assertLanguageTabIsVisible(lang: string) {
    // NOTE: There is no way to define the locator as a property of the class
    // due to the dynamic nature of the language tab locator
    await expect(this.page.locator(`#lang-${lang}`)).toBeVisible();
  }

  async assertSaveChangesButtonIsDisabled() {
    await expect(this.buttonSaveChangesLocator).toBeDisabled();
  }

  async assertSaveChangesButtonIsEnabled() {
    await expect(this.buttonSaveChangesLocator).toBeEnabled();
  }

  async assertCodeEditorIsVisible() {
    await expect(this.codeEditorLocator).toBeVisible();
  }

  async clickOnSaveChangesButton() {
    await this.ensureVisibleToClick(this.buttonSaveChangesLocator);
  }

  /**
   * Click on editor tab
   * NOTE: There is no way to define the locator as a property of the class
   * due to the dynamic nature of the editor tab locator
   * @param editorMode Editor mode
   */
  async clickEditorTab(editorMode: EditorMode) {
    await this.ensureVisibleToClick(this.page.locator(`#editor-mode-${editorMode}`));
  }

  async goToProjectDetailsPage(projectName: string) {
    // NOTE: There is no way to define the locator as a property of the class
    // due to the dynamic nature of the project group card locator
    await this.ensureVisibleToClick(this.page.locator(`#project-group-card-${projectName}`));
    await this.page.waitForURL(new RegExp(`/projects/${projectName}/[a-z]{2}$`));
    await expect(this.buttonNewChunkLocator).toBeVisible();
  }

  async addNewChunkWithTranslations(params: NewChunkOptions) {
    const { name, translations } = params;
    await this.ensureVisibleToClick(this.buttonAddNewChunkLocator);
    await expect(this.cardNewChunkLocator).toBeVisible();
    await this.inputNewChunkNameLocator.fill(name);
    await this.ensureVisibleToClick(this.buttonNewChunkAcceptLocator);

    const { buttonAddTranslationLocator, buttonSaveChunkLocator } = this.getChunkLocators(name);

    for (const translation of Object.entries(translations)) {
      await this.ensureVisibleToClick(buttonAddTranslationLocator);

      const { inputKeyLocator, inputValueLocator, buttonSaveLocator } =
        this.getTranslationFormLocators(name);

      await inputKeyLocator.fill(translation[0]);
      await inputValueLocator.fill(translation[1]);
      await this.ensureVisibleToClick(buttonSaveLocator);
    }

    await this.ensureVisibleToClick(buttonSaveChunkLocator);
    await expect(this.cardNewChunkLocator).toBeHidden();
  }

  /**
   * Login to translations admin
   */
  async login() {
    await this.page.waitForURL(/\/login/);
    await this.fillLoginFormAndSubmit({
      env: this.env,
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    await this.assertIsLoggedIn();

    this.authToken = await this.page.evaluate(() => {
      return localStorage.getItem('authToken');
    });
  }

  getNewTranslationsProjectHttpResponsePromise() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/translations') && response.request().method() === 'POST'
    );
  }

  async createNewTranslationsProject(newTranslationsProjectOptions: NewTranslationsProjectOptions) {
    const { name, lang, defaultJson } = newTranslationsProjectOptions;
    await this.clickOnNewTranslationsProjectButton();
    await this.fillNewTranslationsProjectForm({
      name,
      lang,
      defaultJson,
    });

    // Intercept translations project creation
    const responsePromise = this.getNewTranslationsProjectHttpResponsePromise();

    await this.submitNewTranslationsProjectForm();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const translationsProject = await response.json();
    this.translationsProjectId = translationsProject.id;
  }

  /**
   * Restore backup, due to multiple backups are created, the backup number is required
   * @param n Backup number (use 0 for the first backup)
   */
  async restoreBackup(n: number) {
    await this.ensureVisibleToClick(this.buttonShowBackupModalLocator.nth(n));
    // A modal must be opened with a code editor
    await this.assertCodeEditorIsVisible();
    await this.ensureVisibleToClick(this.buttonRestoreBackupLocator);
  }

  async logout() {
    await this.ensureVisibleToClick(this.buttonLogoutLocator);
    await expect(this.buttonLogoutLocator).toBeHidden();
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Cleanup the created translations project
   */
  async cleanup(projectId: string): Promise<boolean> {
    if (this.authToken) {
      const response = await this.page.request.delete(
        `${this.host}/api/translations/project-id/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.ok();
    }
    return false;
  }
}
