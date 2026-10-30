import { expect, Locator, Page } from '@playwright/test';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
  ROLE_OR_CUSTOM_PERMISSIONS,
  ACCESS_TYPE,
  ROLES_AND_PERMISSIONS_DATA_TEST_IDS,
  ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS,
  RESUME_STEP_DYNAMIC_DATA_TEST_ID,
} from '../constants/rolesAndPermissions';
import {
  getVisiblePermissions,
  togglePermissionCheckbox,
  validatePermissionsChecked,
  checkRandomPermissions,
} from './helpers/permissions';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface AssertPermissionsOptions {
  rolePermissions: string;
  roleEnvironments: string;
  // 'form': still on the create/edit user form, viewing the inline "selected
  //   role" preview (RoleDetailStep.tsx, environment via ResumeStepData).
  // 'detail': viewing the saved user's read-only detail page (UserDetail.tsx,
  //   environment via the userDetailFieldEnvironment DetailField).
  context?: 'form' | 'detail';
}

interface AssertUserDetailsParams {
  userName: string;
  userEmail: string;
  roleOrPermissions: keyof typeof ROLE_OR_CUSTOM_PERMISSIONS;
  environments?: (keyof typeof ENVIRONMENTS)[];
  merchants?: string[];
  permissions?: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]>;
  roleName?: string;
  networkName?: string;
  roleEnvironments?: AssertPermissionsOptions['roleEnvironments'];
  rolePermissions?: AssertPermissionsOptions['rolePermissions'];
}

export type CreateUserOptions = {
  name: string;
  email: string;
  roleOrPermissions: keyof typeof ROLE_OR_CUSTOM_PERMISSIONS;
  networkName: string;
  networkId: string;
  merchantNames: string[];
  environments: (keyof typeof ENVIRONMENTS)[];
  permissions?: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]>;
  extraSetup?: (page: AdminUserManagementPage) => Promise<void>;
};

const urlRolesAndPermissions = `${envConfig.ADMIN_URL}/roles-and-permissions`;
const urlRolesAndPermissionsRolesTab = `${urlRolesAndPermissions}/users`;
const urlRolesAndPermissionsNewUser = `${urlRolesAndPermissionsRolesTab}/new-user`;

export class AdminUserManagementPage {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  // user management locators
  readonly labelTitleCreateUserTitle: Locator;
  readonly labelTitleCreateUserDescription: Locator;
  readonly buttonEditStep: Locator;
  // common steps locators
  readonly buttonStepperFooterConfirmButton: Locator;
  readonly buttonCancelUserCreation: Locator;
  // user info step locators
  readonly inputUserName: Locator;
  readonly inputUserEmail: Locator;
  // custom role or permissions step locators
  readonly radioRole: Locator;
  readonly radioPermissions: Locator;
  readonly selectRole: Locator;
  // access type step locators
  readonly selectAccessType: Locator;
  readonly optionAccessTypeNetwork: Locator;
  readonly optionAccessTypeMerchant: Locator;
  readonly inputSearchRole: Locator;
  readonly networkInputSearch: Locator;
  readonly merchantInputSearch: Locator;
  readonly selectNetwork: Locator;
  readonly selectNetworkMerchants: Locator;
  readonly selectNetworkMerchantsInputSearch: Locator;
  readonly selectMerchants: Locator;
  // environment step locators
  readonly checkboxProductionEnvironment: Locator;
  readonly checkboxSandboxEnvironment: Locator;
  readonly labelSandboxSelectionInfo: Locator;
  // modal locators
  readonly labelSaveUserConfirmationModal: Locator;
  readonly buttonSaveUserConfirmationModal: Locator;
  readonly labelMissingPermissionsErrorMessage: Locator;

  private getRoleOption(roleId: string): Locator {
    return this.page.getByTestId(`roles-and-permissions-select-option-${roleId}`);
  }

  // Locator
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    // user management locators
    this.labelTitleCreateUserTitle = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageUserTitle
    );
    this.labelTitleCreateUserDescription = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageUserDescription
    );
    // common steps locators
    this.buttonEditStep = page.getByTestId('edit-button-step');
    this.buttonStepperFooterConfirmButton = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.stepperFooterConfirmButton
    );
    this.buttonCancelUserCreation = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.buttonGoBack
    );
    // user info step locators
    this.inputUserName = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userNameInput);
    this.inputUserEmail = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userEmailInput);
    // custom role or permissions step locators
    this.radioRole = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleTypeCardRoleRadio);
    this.radioPermissions = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleTypeCardIndividualizedRadio
    );
    // access type step locators
    this.selectAccessType = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectAccessType);
    this.selectNetwork = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetwork);
    this.selectRole = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleSelect);
    this.inputSearchRole = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleSelectInputSearch
    );
    this.networkInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkInputSearch
    );
    this.merchantInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchantInputSearch
    );
    this.selectNetworkMerchants = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkMerchants
    );
    this.selectNetworkMerchantsInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkMerchantsInputSearch
    );
    this.selectMerchants = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchants);
    // AccessTypeStep's default ("select") variant, used by the user-creation flow --
    // a Combobox with per-option testids, unlike RoleForm's RadioCardGroup variant.
    this.optionAccessTypeNetwork = page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.selectAccessTypeOption(ACCESS_TYPE.network)
    );
    this.optionAccessTypeMerchant = page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.selectAccessTypeOption(ACCESS_TYPE.merchant)
    );
    // environment step locators
    this.checkboxProductionEnvironment = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.environmentCheckboxProduction
    );
    this.checkboxSandboxEnvironment = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.environmentCheckboxSandbox
    );
    this.labelSandboxSelectionInfo = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.environmentSandboxInfoAlert
    );
    // permissions step locators
    this.labelMissingPermissionsErrorMessage = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.alertMissingPermissionsErrorMessage
    );
    // modal locators
    this.labelSaveUserConfirmationModal = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.modalUserCreateConfirmationTitle
    );
    this.buttonSaveUserConfirmationModal = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.modalUserConfirmButton
    );
  }

  // Actions
  private async trySelectRole(
    roleName: string,
    attempt: number,
    maxRetries: number
  ): Promise<void> {
    try {
      const responsePromise = this.page.waitForResponse(
        (response) =>
          response.url().includes('/roles/available') &&
          response.status() === 200 &&
          response.request().method() === 'GET',
        { timeout: 3000 }
      );

      await this.selectRole.click();

      const availableRolesResponse = await responsePromise.catch(() => null);

      // Wait for the dropdown to be fully opened and input to be visible
      await expect(this.inputSearchRole).toBeVisible({ timeout: 5000 });
      await expect(this.inputSearchRole).toBeEnabled();

      // Clear any existing text and fill with the role name
      await this.inputSearchRole.clear();
      await this.inputSearchRole.fill(roleName);

      // Wait for the "Cargando" loading indicator inside the open listbox to
      // clear before checking for the option -- the roles-available request
      // can be slow (observed several seconds on staging), and a short fixed
      // wait can fire while the list is still loading.
      const listbox = this.page.getByRole('listbox', { name: 'Seleccionar rol' });
      await listbox
        .getByRole('status')
        .waitFor({ state: 'hidden', timeout: 45000 })
        .catch(() => undefined);

      const availableRoles =
        (
          (await availableRolesResponse?.json().catch(() => null)) as {
            items?: Array<{ id: string; name: string }>;
          } | null
        )?.items ?? [];

      const matchedRole = availableRoles.find((role) => role.name === roleName);
      const roleOption = matchedRole
        ? this.getRoleOption(matchedRole.id)
        : this.page.getByRole('option', { name: roleName }).first();
      const isOptionVisible = await roleOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await roleOption.click();
        return;
      }

      if (attempt >= maxRetries) {
        throw new Error(`Failed to find role option "${roleName}" after ${maxRetries} attempts`);
      }

      await this.closeDropdownAndRetry();
      return this.trySelectRole(roleName, attempt + 1, maxRetries);
    } catch (error) {
      if (attempt >= maxRetries) {
        console.error(`Final error on attempt ${attempt}:`, error.message);
        throw error;
      }

      await this.closeDropdownAndRetry();
      return this.trySelectRole(roleName, attempt + 1, maxRetries);
    }
  }

  private async closeDropdownAndRetry(): Promise<void> {
    // Multiple strategies to ensure dropdown is closed
    try {
      // Strategy 1: Clear the search input first if visible
      const isInputVisible = await this.inputSearchRole.isVisible().catch(() => false);
      if (isInputVisible) {
        await this.inputSearchRole.clear();
        await this.page.waitForTimeout(200);
      }

      // Strategy 2: Press Escape key
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);

      // Strategy 3: Click outside the dropdown (on body)
      await this.page.locator('body').click({ position: { x: 10, y: 10 } });
      await this.page.waitForTimeout(300);

      // Strategy 4: If dropdown is still open, click on the select element to close it
      const isInputStillVisible = await this.inputSearchRole.isVisible().catch(() => false);
      if (isInputStillVisible) {
        await this.selectRole.click();
        await this.page.waitForTimeout(300);
      }

      // Wait for dropdown to be fully closed
      await expect(this.inputSearchRole)
        .not.toBeVisible({ timeout: 2000 })
        .catch(() => undefined);
    } catch {
      // Closing the dropdown is best-effort; the retry below can recover.
    }

    // Final wait before retry
    await this.page.waitForTimeout(500);
  }
  async cancelUserCreation() {
    await this.buttonCancelUserCreation.click();
  }
  async clickStepConfirmButton() {
    await this.buttonStepperFooterConfirmButton.click();
  }
  private getResumeStepValue(dataIdentifier: string): Locator {
    return this.page.getByTestId(RESUME_STEP_DYNAMIC_DATA_TEST_ID.value(dataIdentifier));
  }
  private getResumeStepByContent(value: string): Locator {
    return this.page.locator('[data-testid^="resume-step-"]').filter({ hasText: value }).first();
  }
  // user info step actions
  async fillUserName(userName: string) {
    await this.inputUserName.fill(userName);
  }
  async fillUserLastName(userLastName: string) {
    // Assuming there's a last name field, we'll use a generic approach
    const lastNameInput = this.page.getByRole('textbox', { name: /apellido|last.*name/i });
    await lastNameInput.fill(userLastName);
  }
  async fillUserEmail(userEmail: string) {
    await this.inputUserEmail.fill(userEmail);
  }
  // custom role or permissions step actions
  async chooseRoleOrPermissions(roleOrPermissions: keyof typeof ROLE_OR_CUSTOM_PERMISSIONS) {
    if (roleOrPermissions === ROLE_OR_CUSTOM_PERMISSIONS.role) {
      await this.radioRole.check();
    } else {
      await this.radioPermissions.check();
    }
    await this.assertRoleOrPermissionsIsChecked(roleOrPermissions);
  }
  async selectRoleByName(roleName: string) {
    return this.trySelectRole(roleName, 1, 3);
  }
  // access type step actions
  getOptionMerchant(merchantId: string): Locator {
    return this.page.getByTestId(
      `${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchantOptionPrefix}${merchantId}`
    );
  }
  async selectAccessTypeOption(
    type: (typeof ACCESS_TYPE)[keyof typeof ACCESS_TYPE],
    merchantId?: string
  ) {
    await this.selectAccessType.click();
    if (type === ACCESS_TYPE.network) {
      await this.optionAccessTypeNetwork.click();
      return;
    }
    if (!merchantId) throw new Error('merchantId is required when selecting merchant access type');
    await this.optionAccessTypeMerchant.click();
  }
  getOptionNetwork(networkId: string): Locator {
    return this.page.getByTestId(
      `${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkOptionPrefix}${networkId}`
    );
  }
  async selectNetworkByName(networkName: string, networkId: string) {
    await this.selectNetwork.click();
    await expect(this.networkInputSearch).toBeVisible();
    await this.networkInputSearch.fill(networkName);
    const networkOption = this.getOptionNetwork(networkId);
    await expect(networkOption).toContainText(networkName);
    await networkOption.click();
    await this.page.keyboard.press('Escape');
  }
  async selectMerchantByName(merchantName: string, merchantId: string) {
    await this.selectMerchants.click();
    await expect(this.merchantInputSearch).toBeVisible();
    await this.merchantInputSearch.fill(merchantName);
    const merchantOption = this.getOptionMerchant(merchantId);
    await expect(merchantOption).toContainText(merchantName);
    await merchantOption.click();
    await this.page.keyboard.press('Escape');
    const selectedOption = await this.merchantInputSearch.inputValue();
    expect(selectedOption).toContain(merchantName);
  }
  async selectNetworkMerchantsByName(merchantNames: string[]) {
    // No dedicated testid exists on the MultiSelect's internal search input; the
    // container trigger is the click target, and it's disabled while the newly
    // selected network's merchants are still loading.
    await expect(this.selectNetworkMerchants).toBeEnabled();
    await this.selectNetworkMerchants.click();
    const openListbox = this.page.locator('[role="listbox"]').last();
    await expect(
      openListbox
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.networkMerchantsOptionPrefix}"]`
        )
        .first()
    ).toBeVisible();

    // Filter via the popup's own search box rather than relying on the unfiltered
    // option list, which can be paginated/ordered such that a given name isn't
    // loaded yet (see AdminRoleManagementPage's identical fix). The search input
    // itself has no data-testid at all (a vendored design-system gap, see report)
    // -- this is the one deliberate exception here.
    const searchOptions = this.page.getByRole('textbox', { name: 'Search options' });
    for (const merchantName of merchantNames) {
      await searchOptions.fill(merchantName);
      const merchantOption = this.page
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.networkMerchantsOptionPrefix}"]`
        )
        .filter({ hasText: merchantName });
      await expect(merchantOption).toBeVisible();
      await merchantOption.click();
      await searchOptions.fill('');
    }
    await this.page.keyboard.press('Escape');
  }
  // environment step actions
  async selectProductionEnvironment() {
    await this.checkboxProductionEnvironment.click();
  }
  async selectSandboxEnvironment() {
    await this.checkboxSandboxEnvironment.click();
  }
  private async isControlChecked(locator: Locator): Promise<boolean> {
    const ariaChecked = await locator.getAttribute('aria-checked');
    const dataState = await locator.getAttribute('data-state');
    return ariaChecked === 'true' || dataState === 'checked';
  }

  private async ensureCustomPermissionsMatrixReady(): Promise<void> {
    await expect(this.radioPermissions, 'The custom permissions option is not visible').toBeVisible(
      { timeout: 40000 }
    );
    if (!(await this.isControlChecked(this.radioPermissions))) {
      await this.chooseRoleOrPermissions(ROLE_OR_CUSTOM_PERMISSIONS.permissions);
    }

    await expect(
      this.checkboxProductionEnvironment,
      'The production environment checkbox is not visible'
    ).toBeVisible({ timeout: 40000 });
    if (!(await this.isControlChecked(this.checkboxProductionEnvironment))) {
      await this.selectProductionEnvironment();
    }
  }

  private async expandPermissionResource(resourceValue: string): Promise<void> {
    const collapseHeader = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.collapseHeaderTitle(resourceValue)
    );
    await expect(
      collapseHeader,
      `The permissions section ${resourceValue} is not visible`
    ).toBeVisible({ timeout: 40000 });
    if ((await collapseHeader.getAttribute('aria-expanded')) !== 'true') {
      await collapseHeader.click();
    }
  }

  // permissions step actions
  async checkResource(resource: keyof typeof RESOURCES, merchantId: string) {
    await this.ensureCustomPermissionsMatrixReady();
    await this.expandPermissionResource(RESOURCES[resource]);
    await togglePermissionCheckbox({ page: this.page, key: resource, merchantId, check: true });
  }
  async uncheckResource(resource: keyof typeof RESOURCES, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: resource, merchantId, check: false });
  }
  async checkAction(action: keyof typeof ACTIONS, merchantId: string) {
    await this.ensureCustomPermissionsMatrixReady();
    const actionValue = ACTIONS[action];
    const parentResource = Object.values(RESOURCES).find((resourceValue) =>
      actionValue.startsWith(`${resourceValue.split('_')[0]}_`)
    );
    if (parentResource) {
      await this.expandPermissionResource(parentResource);
    }
    await togglePermissionCheckbox({ page: this.page, key: action, merchantId, check: true });
  }
  async uncheckAction(action: keyof typeof ACTIONS, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: action, merchantId, check: false });
  }
  // The /merchants/admin/permissions fetch this waits for isn't scoped by merchant
  // or reissued on demand (useQueryResourcesAndPermissions has a bare query key and
  // a 1h staleTime) -- under load (parallel workers, staging latency, same class of
  // slowness as the earlier /roles/available issue) it can take longer than a hard
  // wait should tolerate, or may simply resolve slightly before this method starts
  // watching for it. Mirrors AdminRoleManagementPage.waitForPermissionsToLoad: tolerate
  // a miss on the network signal and fall back to the DOM sentinel below, which
  // Playwright's own auto-retrying `expect` will wait for regardless.
  private async waitForPermissionsToLoad(): Promise<void> {
    try {
      await this.page.waitForResponse(
        (response) => response.url().includes('/merchants/admin/permissions'),
        { timeout: 5000 }
      );
    } catch {
      // The permissions response may have completed before this listener was registered.
    }
  }

  async checkRandomPermissions(
    merchantId: string,
    total: number = 3
  ): Promise<(keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
    await this.waitForPermissionsToLoad();
    // Resource section headers are collapse-row titles, not headings.
    const sentinel = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.collapseHeaderTitle(RESOURCES.orders)
    );

    await expect(sentinel).toBeVisible();

    return checkRandomPermissions(this.page, merchantId, total);
  }
  // confirmation modal actions
  async confirmSaveUserModal(): Promise<string> {
    const requestPromise = this.page.waitForRequest(
      (request) => request.url().includes('v2/merchants/users') && request.method() === 'POST'
    );

    await this.buttonSaveUserConfirmationModal.click();

    const request = await requestPromise;
    const requestBody = request.postDataJSON();
    const password = requestBody?.password || '';

    return password;
  }

  async confirmEditUserRequest(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/v2/merchants/users') && response.request().method() === 'PATCH'
    );

    await this.buttonSaveUserConfirmationModal.click();

    const response = await responsePromise;
    expect(response.ok()).toBe(true);
  }

  // Assertions:
  async assertPresenceInCreateUserForm() {
    expect(this.page.url().replace(/\/$/, '')).toBe(
      urlRolesAndPermissionsNewUser.replace(/\/$/, '')
    );
    await expect(this.labelTitleCreateUserTitle).toBeVisible();
    await expect(this.labelTitleCreateUserDescription).toBeVisible();
  }
  async assertSelectedValuesAreInResume(values: string[]) {
    for (const value of values) {
      const locator = this.getResumeStepValue(value);
      await expect(locator).toContainText(value);
    }
  }
  async assertUserDetails({
    userName,
    userEmail,
    roleOrPermissions,
    roleName,
    merchants,
    environments,
    permissions,
    networkName,
    rolePermissions,
    roleEnvironments,
  }: AssertUserDetailsParams) {
    // "View user details" renders a dedicated UserDetail.tsx; each field is a
    // DetailField with its own data-testid (admin-ff patch -- see report; the
    // dataTestId prop already existed on DetailField, it just wasn't being passed).
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldName)
    ).toContainText(userName);
    // The displayed email is lowercased by the backend regardless of the case it was
    // submitted with, so match case-insensitively.
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldEmail)
    ).toContainText(new RegExp(escapeRegExp(userEmail), 'i'));

    if (roleOrPermissions === ROLE_OR_CUSTOM_PERMISSIONS.permissions) {
      if (!networkName || !merchants || !environments || !permissions) {
        throw new Error('Missing user permission details for resume assertions');
      }

      await expect(
        this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldAccessType)
      ).toContainText(this.selectors.screenRolesAndPermissions.radioPermissions);

      await expect(
        this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldNetwork)
      ).toContainText(networkName);

      const commercesField = this.page.getByTestId(
        ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldCommerces
      );
      for (const merchantName of merchants) {
        await expect(commercesField).toContainText(merchantName);
      }

      const environmentsDetail = environments.map((env) =>
        env === ENVIRONMENTS.production
          ? this.selectors.screenRolesAndPermissions.checkboxProductionEnvironment
          : this.selectors.screenRolesAndPermissions.checkboxSandboxEnvironment
      );
      const environmentField = this.page.getByTestId(
        ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldEnvironment
      );
      for (const environmentLabel of environmentsDetail) {
        await expect(environmentField).toContainText(environmentLabel);
      }
    }

    if (roleOrPermissions === ROLE_OR_CUSTOM_PERMISSIONS.role) {
      if (!roleName || !rolePermissions || !roleEnvironments) {
        throw new Error('Missing role details for resume assertions');
      }

      await expect(
        this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldRole)
      ).toContainText(roleName);

      await this.assertRoleDetails({
        rolePermissions,
        roleEnvironments,
        context: 'detail',
      });
    }

    if (roleOrPermissions === ROLE_OR_CUSTOM_PERMISSIONS.permissions) {
      for (const [merchantId, keys] of Object.entries(permissions)) {
        await validatePermissionsChecked({ page: this.page, merchantId, keys });
      }
    }
  }
  async assertUserDetailsAreReadOnly(merchantIds: string[]) {
    const elementsToCheckIfHidden = [
      this.inputUserName,
      this.inputUserEmail,
      this.radioPermissions,
      this.radioRole,
      this.selectRole,
      this.networkInputSearch,
      this.merchantInputSearch,
      this.selectNetwork,
      this.selectNetworkMerchants,
      this.selectMerchants,
      this.checkboxProductionEnvironment,
      this.checkboxSandboxEnvironment,
      this.buttonEditStep,
    ];

    await Promise.all(elementsToCheckIfHidden.map((element) => expect(element).toBeHidden()));

    // UserDetail.tsx (the dedicated read-only view) has no form/footer at all -- just
    // a "go back" button, unlike the stepper footer's confirm button on the create/edit form.
    await expect(this.buttonCancelUserCreation).toBeVisible();

    const allPermissionsToCheck = await Promise.all(
      merchantIds.map(async (merchantId) => {
        const visiblePermissions = await getVisiblePermissions(this.page, merchantId);
        return visiblePermissions.map(({ value }) => ({ merchantId, value }));
      })
    );

    const flatPermissions = allPermissionsToCheck.flat();

    for (const { merchantId, value } of flatPermissions) {
      const checkboxTestId = `checkbox-${value}-${merchantId}`;
      const locator = this.page.getByTestId(checkboxTestId);

      await expect(locator).toBeDisabled({ timeout: 5000 });
    }
  }
  // user info step assertions
  // NOTE: the create/edit user form no longer has a "current step" concept
  // (every section renders at once -- see UserForm.tsx), so these just check
  // that the section's heading and control are present on the page.
  async assertUserInfoStepIsActive() {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userFormUserInfoSectionTitle)
    ).toBeVisible();
    await expect(this.inputUserName).toBeVisible();
    await expect(this.inputUserEmail).toBeVisible();
  }
  async assertUserNameIsFilled(userName: string) {
    const userNameValue = await this.inputUserName.inputValue();
    expect(userNameValue).toBe(userName);
  }
  async assertUserEmailIsFilled(userEmail: string) {
    const userEmailValue = await this.inputUserEmail.inputValue();
    expect(userEmailValue).toBe(userEmail);
  }
  async assertUserNameDetailIsVisible(userName: string) {
    await expect(this.getResumeStepByContent(userName)).toContainText(userName);
  }
  async assertUserEmailDetailIsVisible(userEmail: string) {
    await expect(this.getResumeStepByContent(userEmail)).toContainText(userEmail);
  }
  // assert custom role or permissions step assertions
  async assertCustomRoleOrPermissionsStepIsActive() {
    await expect(
      this.page.getByTestId(
        ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userFormRoleOrPermissionsSectionTitle
      )
    ).toBeVisible();
    await expect(this.radioRole).toBeVisible();
    await expect(this.radioRole).toBeEnabled();
    await expect(this.radioPermissions).toBeEnabled();
    await expect(this.radioPermissions).toBeVisible();
  }
  async assertRoleRadioIsChecked() {
    await expect(this.radioRole).toBeChecked();
  }
  async assertPermissionsRadioIsChecked() {
    await expect(this.radioPermissions).toBeChecked();
  }
  async assertRoleSelectIsVisible() {
    await expect(this.selectRole).toBeVisible();
    await expect(this.selectRole).toBeEnabled();
  }
  async assertRoleIsInTheList(roleName: string) {
    const roleOption = this.page.getByRole('option', { name: roleName });
    await expect(roleOption).toBeVisible();
  }
  async assertSelectedRole(roleName: string) {
    // selectRole is the Combobox's outer container/trigger div; the selected
    // value renders as the value of the nested <input> (inputSearchRole), not
    // as text content of the container (see assertSelectedNetwork/
    // assertSelectedMerchant in adminRoleManagementPage.ts for the same
    // pattern on the equivalent network/merchant Comboboxes).
    await this.selectRole.waitFor({ state: 'visible', timeout: 5000 });
    const selectedValue = await this.inputSearchRole.inputValue();
    expect(selectedValue).toContain(roleName);
  }
  // access type step assertions
  async assertAccessTypeStepIsActive() {
    // Unlike RoleForm, UserForm's AccessTypeStep is nested inside the
    // "individualized" RoleTypeCard with no FormCard/heading of its own at all --
    // assert whichever control it renders instead (same approach as
    // assertCommerceStepIsActive below).
    await expect(
      this.selectAccessType.or(this.selectNetworkMerchants).or(this.selectMerchants)
    ).toBeVisible();
  }

  async assertCommerceStepIsActive() {
    // AccessTypeStep is nested inside the "individualized" RoleTypeCard with no
    // section heading of its own anymore -- assert whichever control it renders
    // is visible (the access-type picker itself only shows for a user who can
    // choose between access types; a user already scoped to one network/merchant
    // goes straight to a network-merchants or merchant select).
    await expect(
      this.selectAccessType.or(this.selectNetworkMerchants).or(this.selectMerchants)
    ).toBeVisible();
  }

  // environment step assertions
  async assertSelectEnvironmentStepIsActive() {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userFormEnvironmentSectionTitle)
    ).toBeVisible();
  }
  async assertProductionEnvironmentIsChecked() {
    await expect(this.checkboxProductionEnvironment).toBeChecked();
  }
  async assertSandboxEnvironmentIsChecked() {
    await expect(this.checkboxSandboxEnvironment).toBeChecked();
    await expect(this.labelSandboxSelectionInfo).toBeVisible();
  }
  // permissions step assertions
  async assertPermissionsChecked(
    merchantId: string,
    keys: (keyof typeof RESOURCES | keyof typeof ACTIONS)[]
  ): Promise<void> {
    await validatePermissionsChecked({ page: this.page, merchantId, keys });
  }
  // modal assertions
  async assertSaveUserConfirmationModalIsVisible() {
    await expect(this.labelSaveUserConfirmationModal).toBeVisible();
  }
  async assertMissingPermissionsErrorMessageIsVisible() {
    await expect(this.labelMissingPermissionsErrorMessage).toBeVisible();
  }
  // role details assertions
  async assertRoleDetails({
    rolePermissions,
    roleEnvironments,
    context = 'form',
  }: AssertPermissionsOptions): Promise<void> {
    const parsedRoleResources: {
      merchant_id: string;
      permissions: (
        | (typeof RESOURCES)[keyof typeof RESOURCES]
        | (typeof ACTIONS)[keyof typeof ACTIONS]
      )[];
    }[] = typeof rolePermissions === 'string' ? JSON.parse(rolePermissions) : rolePermissions;

    const parsedEnvironments: string[] =
      typeof roleEnvironments === 'string' ? JSON.parse(roleEnvironments) : roleEnvironments;

    if (parsedEnvironments.length) {
      const environmentsDetail = parsedEnvironments.map((env) =>
        env === ENVIRONMENTS.production
          ? this.selectors.screenRolesAndPermissions.checkboxProductionEnvironment
          : this.selectors.screenRolesAndPermissions.checkboxSandboxEnvironment
      );
      if (context === 'form') {
        // Inline "selected role" preview shown while still on the create/edit
        // user form (RoleDetailStep.tsx) -- it renders environment labels via
        // the generic ResumeStepData molecule, which testid's each value by
        // its own label (RESUME_STEP_DYNAMIC_DATA_TEST_ID).
        for (const environmentLabel of environmentsDetail) {
          await expect(this.getResumeStepValue(environmentLabel)).toContainText(environmentLabel);
        }
      } else {
        // Post-creation read-only page (UserDetail.tsx) -- environment is a
        // DetailField there, same testid used for the custom-permissions path.
        const environmentField = this.page.getByTestId(
          ROLES_AND_PERMISSIONS_DATA_TEST_IDS.userDetailFieldEnvironment
        );
        for (const environmentLabel of environmentsDetail) {
          await expect(environmentField).toContainText(environmentLabel);
        }
      }
    }

    const validPermissionValues = new Set([...Object.values(RESOURCES), ...Object.values(ACTIONS)]);

    for (const { merchant_id, permissions } of parsedRoleResources) {
      const filteredValues = permissions.filter((permission) =>
        validPermissionValues.has(permission)
      );
      await validatePermissionsChecked({
        page: this.page,
        merchantId: merchant_id,
        values: filteredValues,
      });
    }
  }
  async assertRoleOrPermissionsIsChecked(
    roleOrPermissions: keyof typeof ROLE_OR_CUSTOM_PERMISSIONS
  ): Promise<void> {
    if (roleOrPermissions === ROLE_OR_CUSTOM_PERMISSIONS.role) {
      await this.assertRoleRadioIsChecked();
      return;
    }
    await this.assertPermissionsRadioIsChecked();
  }

  async createUser(options: CreateUserOptions): Promise<string> {
    const {
      name,
      email,
      roleOrPermissions,
      networkName,
      merchantNames,
      environments,
      permissions = {},
      extraSetup,
    } = options;

    await this.assertPresenceInCreateUserForm();
    await this.assertUserInfoStepIsActive();
    await this.fillUserName(name);
    await this.assertUserNameIsFilled(name);
    await this.fillUserEmail(email);
    await this.assertUserEmailIsFilled(email);

    await this.assertCustomRoleOrPermissionsStepIsActive();
    await this.chooseRoleOrPermissions(roleOrPermissions);

    await this.assertAccessTypeStepIsActive();

    // Since ADM-5048 admin-ff no longer preselects the network access type for a
    // superadmin; the network select only renders once it is chosen explicitly.
    await this.selectAccessTypeOption(ACCESS_TYPE.network);
    await this.selectNetworkByName(networkName, options.networkId);
    await this.selectNetworkMerchantsByName(merchantNames);

    await this.assertSelectEnvironmentStepIsActive();
    const hasProduction = environments.includes(ENVIRONMENTS.production);
    const hasSandbox = environments.includes(ENVIRONMENTS.sandbox);

    if (hasProduction) {
      await this.selectProductionEnvironment();
      await this.assertProductionEnvironmentIsChecked();
    }

    if (hasSandbox) {
      await this.selectSandboxEnvironment();
      await this.assertSandboxEnvironmentIsChecked();
    }

    for (const [merchantId, keys] of Object.entries(permissions)) {
      for (const key of keys) {
        if (key in RESOURCES) {
          await this.checkResource(key as keyof typeof RESOURCES, merchantId);
        } else {
          await this.checkAction(key as keyof typeof ACTIONS, merchantId);
        }
      }
    }

    if (extraSetup) {
      await extraSetup(this);
    }

    await this.clickStepConfirmButton();
    return this.confirmSaveUserModal();
  }
}
