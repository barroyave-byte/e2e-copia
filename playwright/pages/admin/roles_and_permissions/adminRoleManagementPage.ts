import { expect, Locator, Page } from '@playwright/test';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
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
  checkAllColumnMerchantPermissions,
  expandAllPermissionResources,
  uncheckAllPermissions,
} from './helpers/permissions';
import { EditButtonIds } from '@support/interfaces/adminRolesAndPermissions';

const urlRolesAndPermissions = `${envConfig.ADMIN_URL}/roles-and-permissions`;
const urlRolesAndPermissionsRolesTab = `${urlRolesAndPermissions}/roles`;
const urlRolesAndPermissionsNew = `${urlRolesAndPermissionsRolesTab}/new-role`;

export class AdminRoleManagementPage {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  // role management locators
  readonly labelTitleCreateRoleTitle: Locator;
  readonly labelTitleCreateRoleDescription: Locator;
  readonly labelEditRoleTitle: Locator;
  readonly labelEditRoleDescription: Locator;
  readonly buttonGoBack: Locator;
  // common steps locators
  // The network-merchants MultiSelect's "Select all" is a plain footer button with
  // no data-testid (design-system MultiSelect.tsx has no i18n either -- text is
  // stable, hardcoded English), so it's targeted by role+name instead.
  readonly buttonSelectAllNetworkMerchants: Locator;
  readonly buttonSaveRole: Locator;
  readonly buttonSaveChanges: Locator;
  readonly buttonConfirmModal: Locator;
  readonly buttonCancelModal: Locator;
  readonly buttonCancel: Locator;
  // role name step locators
  readonly inputRoleName: Locator;
  // access type step locators
  readonly selectAccessType: Locator;
  readonly radioAccessTypeNetwork: Locator;
  readonly radioAccessTypeMerchant: Locator;
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
  // permissions step locators
  readonly checkboxResources: Record<keyof typeof RESOURCES, Locator>;
  readonly checkboxActions: Record<keyof typeof ACTIONS, Locator>;
  readonly labelMissingPermissionsErrorMessage: Locator;

  // Locator
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    // role management locators
    // ManageRole.tsx's SectionHeader uses the same testid for create/edit/view mode
    // -- only the text content differs, so both title locators share it.
    this.labelTitleCreateRoleTitle = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageRoleTitle
    );
    this.labelTitleCreateRoleDescription = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageRoleDescription
    );
    this.labelEditRoleTitle = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageRoleTitle);
    this.labelEditRoleDescription = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.manageRoleDescription
    );
    // common steps locators
    this.buttonSelectAllNetworkMerchants = page.getByRole('button', { name: 'Select all' });
    this.buttonSaveRole = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.stepperFooterConfirmButton
    );
    this.buttonSaveChanges = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.stepperFooterConfirmButton
    );
    this.buttonConfirmModal = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.stepperRoleConfirmModalButton
    );
    this.buttonCancelModal = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.stepperRoleCancelModalButton
    );
    this.buttonCancel = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.buttonGoBack);
    this.buttonGoBack = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.buttonGoBack);
    // role name step locators
    this.inputRoleName = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleNameInput);
    // access type step locators
    this.selectAccessType = page.getByTestId('roles-and-permissions-select-access-type');
    this.selectNetwork = page.getByTestId('roles-and-permissions-select-network');
    this.networkInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkInputSearch
    );
    this.merchantInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchantInputSearch
    );
    this.selectNetworkMerchants = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkMerchants
    );
    // No dedicated testid exists on the MultiSelect's internal search input.
    this.selectNetworkMerchantsInputSearch = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectNetworkMerchantsInputSearch
    );
    this.selectMerchants = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchants);
    // Access type moved from a select+option dropdown to a RadioCardGroup;
    // each card's radio control carries its own dedicated testid.
    this.radioAccessTypeNetwork = page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.accessTypeCardRadio(ACCESS_TYPE.network)
    );
    this.radioAccessTypeMerchant = page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.accessTypeCardRadio(ACCESS_TYPE.merchant)
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
  }

  // Actions
  async cancelRoleCreation() {
    await this.buttonCancel.click();
  }

  async saveRole() {
    const roleResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/merchants/admin/roles')
    );
    await this.attemptSaveRole();
    const response = await roleResponse;
    const responseBody = await response.text().catch(() => '');
    expect(
      response.ok(),
      `Creating the role failed with status ${response.status()}: ${responseBody}`
    ).toBe(true);
  }

  async attemptSaveRole() {
    await this.buttonSaveRole.click();
  }

  async saveChanges() {
    await this.buttonSaveChanges.click();
    await expect(this.buttonConfirmModal).toBeVisible();
    await this.buttonConfirmModal.click();
  }
  private getResumeStepValue(dataIdentifier: string): Locator {
    return this.page.getByTestId(RESUME_STEP_DYNAMIC_DATA_TEST_ID.value(dataIdentifier));
  }
  // role name step actions
  async fillRoleName(rolName: string) {
    await this.inputRoleName.fill(rolName);
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
    if (type === ACCESS_TYPE.network) {
      await this.radioAccessTypeNetwork.click();
      return;
    }
    if (!merchantId) throw new Error('merchantId is required when selecting merchant access type');
    await this.radioAccessTypeMerchant.click();
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
  async selectAllNetworkMerchants() {
    // The "Select all" footer button only renders once the network's merchants
    // have finished loading inside the open popover. This has been observed to
    // occasionally not appear on the first open when run as part of the full spec
    // (not reproducible in isolation) -- retry by closing and reopening rather
    // than failing outright, same pattern as AdminHomePage.goToReconciliations().
    // The options-visible check below participates in the same retry (a fresh
    // popover mount on reopen, not just a longer wait) -- confirmed live that the
    // underlying data fetch itself is fast (~300ms) even when this hangs, so a
    // longer timeout on a single open doesn't help; a fresh mount might.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Disabled while the newly selected network's merchants are still loading.
      await expect(this.selectNetworkMerchants).toBeEnabled();
      await this.selectNetworkMerchants.click();
      // Scoped to the last (most recently opened) listbox -- a just-closed combobox's
      // (network) listbox can still be present/animating out and would otherwise
      // give a false positive that the merchants list is ready.
      const openListbox = this.page.locator('[role="listbox"]').last();
      const optionsVisible = await openListbox
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.networkMerchantsOptionPrefix}"]`
        )
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      if (!optionsVisible) {
        await this.page.keyboard.press('Escape');
        if (attempt === maxAttempts) {
          throw new Error(`Network merchants options never appeared after ${maxAttempts} attempts`);
        }
        continue;
      }
      // Locator.isVisible() doesn't accept a timeout and never waits/retries --
      // use waitFor so the button actually gets a chance to render.
      const selectAllVisible = await this.buttonSelectAllNetworkMerchants
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (selectAllVisible) {
        await this.buttonSelectAllNetworkMerchants.click();
        break;
      }
      await this.page.keyboard.press('Escape');
      if (attempt === maxAttempts) {
        throw new Error(`"Select all" button never appeared after ${maxAttempts} attempts`);
      }
    }
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
  }
  async selectMerchantsByName(merchantNames: string[]) {
    expect(this.selectMerchants).toBeVisible();
    await this.selectMerchants.click();
    await expect(this.merchantInputSearch).toBeVisible();
    for (const merchantName of merchantNames) {
      await this.merchantInputSearch.fill(merchantName);
      const merchantOption = this.page
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.selectMerchantOptionPrefix}"]`
        )
        .filter({ hasText: merchantName });
      await expect(merchantOption).toBeVisible();
      await merchantOption.click();
    }
    await this.page.keyboard.press('Escape');
  }

  // The design-system MultiSelect's trigger chips are responsive: only as many
  // "Remove {label}" chips as fit the trigger width render (ResizeObserver-driven
  // `recomputeFit`); any selections beyond that collapse into a non-interactive
  // "+N" badge instead of a chip. With this "sm"-sized combobox and real merchant
  // names, that's often just 1 chip -- so counting/matching "Remove X" buttons
  // undercounts (or entirely misses) the true selection past the first one, even
  // though the underlying state is always complete and correct. Confirmed via live
  // instrumentation of admin-ff (ADM-4975) before concluding this is a page-object
  // bug, not an app bug. The true total is chips-shown + the overflow badge's own
  // number, and it's readable whether the dropdown is open or closed since the
  // trigger (unlike the popover content) never unmounts.
  private async getSelectedNetworkMerchantsCount(): Promise<number> {
    const visibleChipsCount = await this.selectNetworkMerchants
      .getByRole('button', { name: /^Remove / })
      .count();
    // MultiSelect also renders an aria-hidden "+N" badge inside its invisible
    // chip-measurement layer (used to size the real one) with the same text
    // pattern -- getByText() isn't role-scoped, so it matches that hidden badge
    // too. Find the one actually visible rather than assuming DOM/match order.
    const overflowCandidates = this.selectNetworkMerchants.getByText(/^\+\d+$/);
    const overflowCandidateCount = await overflowCandidates.count();
    let overflowCount = 0;
    for (let i = 0; i < overflowCandidateCount; i++) {
      const candidate = overflowCandidates.nth(i);
      if (await candidate.isVisible()) {
        const text = await candidate.textContent();
        overflowCount = text ? parseInt(text.replace('+', ''), 10) : 0;
        break;
      }
    }
    return visibleChipsCount + overflowCount;
  }

  async selectNetworkMerchantsByName(merchantNames: string[]) {
    // Wait for the merchants to finish loading inside the open popover before
    // looking for a specific option -- occasionally doesn't render on the first
    // open (see selectAllNetworkMerchants's identical retry for the same flake).
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await expect(this.selectNetworkMerchants).toBeEnabled();
      await this.selectNetworkMerchants.click();
      const openListbox = this.page.locator('[role="listbox"]').last();
      const optionsVisible = await openListbox
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.networkMerchantsOptionPrefix}"]`
        )
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (optionsVisible) break;
      await this.page.keyboard.press('Escape');
      if (attempt === maxAttempts) {
        throw new Error(`Network merchants options never appeared after ${maxAttempts} attempts`);
      }
    }
    // Filter via the popup's own search box rather than relying on the unfiltered
    // option list, which can be paginated/ordered such that a given name isn't
    // loaded yet. MultiSelect's search input has no data-testid at all (a vendored
    // design-system gap, see report) -- this is the one deliberate exception here.
    const searchOptions = this.page.getByRole('textbox', { name: 'Search options' });
    let expectedCount = await this.getSelectedNetworkMerchantsCount();
    for (const merchantName of merchantNames) {
      await searchOptions.fill(merchantName);
      const merchantOption = this.page
        .locator(
          `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.networkMerchantsOptionPrefix}"]`
        )
        .filter({ hasText: merchantName });
      await expect(merchantOption).toBeVisible();
      // aria-selected on the option row always reflects true selection state,
      // regardless of whether this option's chip fits the trigger (see comment
      // on getSelectedNetworkMerchantsCount above).
      const wasSelected = (await merchantOption.getAttribute('aria-selected')) === 'true';
      const expectedAriaSelected = wasSelected ? 'false' : 'true';
      expectedCount += wasSelected ? -1 : 1;
      // Occasionally a click doesn't stick when several merchants are toggled
      // in the same open dropdown session (observed on staging: adding a
      // 2nd/3rd merchant, or one right after a permissions-matrix recompute,
      // can silently no-op). Re-clicking the same stale option reference
      // doesn't help, so close and reopen the dropdown fresh for each name
      // and re-filter from scratch before clicking.
      let toggled = false;
      for (let clickAttempt = 1; clickAttempt <= 3 && !toggled; clickAttempt++) {
        if (clickAttempt > 1) {
          await this.page.keyboard.press('Escape');
          await expect(this.selectNetworkMerchants).toBeEnabled();
          await this.selectNetworkMerchants.click();
          await searchOptions.fill(merchantName);
          await expect(merchantOption).toBeVisible();
        }
        await merchantOption.click();
        toggled = await expect(merchantOption)
          .toHaveAttribute('aria-selected', expectedAriaSelected, { timeout: 3000 })
          .then(() => true)
          .catch(() => false);
      }
      await expect(merchantOption).toHaveAttribute('aria-selected', expectedAriaSelected);
      await expect
        .poll(() => this.getSelectedNetworkMerchantsCount(), { timeout: 40000 })
        .toBe(expectedCount);
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
  // permissions step actions
  async checkAllColumnMerchantPermissions(
    merchantId: string
  ): Promise<(keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
    return checkAllColumnMerchantPermissions(this.page, merchantId);
  }
  async checkResource(resource: keyof typeof RESOURCES, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: resource, merchantId, check: true });
  }
  async uncheckResource(resource: keyof typeof RESOURCES, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: resource, merchantId, check: false });
  }
  async checkAction(action: keyof typeof ACTIONS, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: action, merchantId, check: true });
  }
  async uncheckAction(action: keyof typeof ACTIONS, merchantId: string) {
    await togglePermissionCheckbox({ page: this.page, key: action, merchantId, check: false });
  }
  async uncheckAllPermissions(merchantId: string) {
    await this.ensurePermissionsVisible();
    await uncheckAllPermissions(this.page, merchantId);
  }
  // Private helper methods
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

  private async ensurePermissionsVisible(): Promise<void> {
    // Resource section headers are collapse-row titles, not headings.
    const sentinel = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.collapseHeaderTitle(RESOURCES.orders)
    );
    await expect(sentinel).toBeVisible();
  }

  private async checkPermissionCheckbox(
    checkboxTestId: string,
    permissionName: string
  ): Promise<void> {
    const checkbox = this.page.getByTestId(checkboxTestId);

    await expect(checkbox).toBeVisible({ timeout: 5000 });
    await expect(checkbox).toBeEnabled({ timeout: 5000 });

    const ariaChecked = await checkbox.getAttribute('aria-checked');
    if (ariaChecked !== 'true') {
      await checkbox.scrollIntoViewIfNeeded();

      const maxAttempts = 3;
      let currentState = ariaChecked;

      for (let attempt = 0; attempt < maxAttempts && currentState !== 'true'; attempt++) {
        try {
          await checkbox.click({
            force: attempt > 0,
            timeout: 5000,
          });
          await expect
            .poll(async () => checkbox.getAttribute('aria-checked'), { timeout: 1500 })
            .toBe('true');
          currentState = 'true';
          break;
        } catch {
          currentState = await checkbox.getAttribute('aria-checked');
        }
      }

      if (currentState !== 'true') {
        throw new Error(
          `Failed to check ${permissionName} after ${maxAttempts} attempts. Final state: ${currentState}`
        );
      }
    }

    await expect(checkbox).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
  }

  // Public methods
  async checkSpecificResource(resource: keyof typeof RESOURCES, merchantId: string): Promise<void> {
    await this.waitForPermissionsToLoad();
    await this.ensurePermissionsVisible();
    await expandAllPermissionResources(this.page);

    const resourceValue = RESOURCES[resource];
    const checkboxTestId = `checkbox-${resourceValue}-${merchantId}`;

    await this.checkPermissionCheckbox(checkboxTestId, `Resource ${resource}`);
  }

  async checkSpecificAction(action: keyof typeof ACTIONS, merchantId: string): Promise<void> {
    await this.waitForPermissionsToLoad();
    await this.ensurePermissionsVisible();
    await expandAllPermissionResources(this.page);

    const actionValue = ACTIONS[action];
    const checkboxTestId = `checkbox-${actionValue}-${merchantId}`;

    await this.checkPermissionCheckbox(checkboxTestId, `Action ${action}`);
  }
  async checkRandomPermissions(
    merchantId: string,
    total: number = 3
  ): Promise<(keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
    await this.waitForPermissionsToLoad();
    await this.ensurePermissionsVisible();

    return checkRandomPermissions(this.page, merchantId, total);
  }

  // Assertions:
  async assertPresenceInCreateRoleForm() {
    expect(this.page.url()).toBe(`${urlRolesAndPermissionsNew}`);
    await expect(this.labelTitleCreateRoleTitle).toBeVisible();
    await expect(this.labelTitleCreateRoleDescription).toBeVisible();
  }
  async assertPresenceInEditRoleForm(roleName: string, roleId: string) {
    expect(this.page.url()).toBe(`${urlRolesAndPermissionsRolesTab}/${roleId}`);
    await expect(this.labelEditRoleTitle).toBeVisible();
    await expect(this.labelEditRoleDescription).toBeVisible();
    await expect(this.buttonSaveChanges).toBeVisible();
    await expect(this.buttonCancel).toBeVisible();
  }
  async assertSelectedValuesAreInResume(values: string[]) {
    for (const value of values) {
      const locator = this.getResumeStepValue(value);
      await expect(locator).toContainText(value);
    }
  }
  async assertRoleNameIsFilled(roleName: string) {
    const roleNameValue = await this.inputRoleName.inputValue();
    expect(roleNameValue).toBe(roleName);
  }
  async assertSelectedAccessType(type: (typeof ACCESS_TYPE)[keyof typeof ACCESS_TYPE]) {
    const radio =
      type === ACCESS_TYPE.network ? this.radioAccessTypeNetwork : this.radioAccessTypeMerchant;
    await expect(radio).toHaveAttribute('data-state', 'checked');
  }
  async assertSelectedNetwork(networkName: string) {
    // selectNetwork is the Combobox's outer container/trigger div; the selected value
    // renders as the value of the nested <input> (networkInputSearch), not as text content.
    const selectedOption = await this.networkInputSearch.inputValue();
    expect(selectedOption).toContain(networkName);
  }
  async assertSelectedMerchant(merchantName: string) {
    const selectedOption = await this.merchantInputSearch.inputValue();
    expect(selectedOption).toContain(merchantName);
  }
  async assertSelectedNetworkMerchants(selectedMerchants: number, totalMerchants: number) {
    // There's no way to read the total from the closed trigger, so only the
    // selected count is verified here (see getSelectedNetworkMerchantsCount for
    // why this can't just count "Remove {label}" chip buttons).
    await expect
      .poll(() => this.getSelectedNetworkMerchantsCount(), { timeout: 40000 })
      .toBe(selectedMerchants);
  }
  async assertActivateButtonIsEnabled() {
    await expect(this.buttonSaveRole).toBeEnabled();
  }

  async assertMissingPermissionsErrorMessageIsVisible() {
    await expect(this.labelMissingPermissionsErrorMessage).toBeVisible();
  }
  async assertRoleDetails({
    roleName,
    permissions,
    environments,
    merchants,
    networkName,
  }: {
    roleName: string;
    permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]>;
    environments: (keyof typeof ENVIRONMENTS)[];
    merchants: string[];
    networkName?: string;
  }): Promise<void> {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldName)
    ).toContainText(roleName);

    if (networkName) {
      await expect(
        this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldNetwork)
      ).toContainText(networkName);
    }

    const commercesField = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldCommerces
    );
    for (const merchantName of merchants) {
      await expect(commercesField).toContainText(merchantName);
    }

    if (environments.length) {
      const environmentField = this.page.getByTestId(
        ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldEnvironment
      );
      for (const env of environments) {
        const label =
          env === ENVIRONMENTS.production
            ? this.selectors.screenRolesAndPermissions.checkboxProductionEnvironment
            : this.selectors.screenRolesAndPermissions.checkboxSandboxEnvironment;
        await expect(environmentField).toContainText(label);
      }
    }

    for (const [merchantId, keys] of Object.entries(permissions)) {
      await validatePermissionsChecked({ page: this.page, merchantId, keys });
    }
  }
  getRoleDetailNetworkField(): Locator {
    return this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldNetwork);
  }
  getRoleDetailCommercesField(): Locator {
    return this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleDetailFieldCommerces);
  }
  async assertRoleDetailsAreReadOnly(merchantIds: string[]) {
    const elementsToCheckIfHidden = [
      this.inputRoleName,
      this.networkInputSearch,
      this.merchantInputSearch,
      this.selectNetwork,
      this.selectNetworkMerchants,
      this.selectMerchants,
      this.checkboxProductionEnvironment,
      this.checkboxSandboxEnvironment,
    ];

    await Promise.all(elementsToCheckIfHidden.map((element) => expect(element).toBeHidden()));

    await expect(this.buttonGoBack).toBeVisible();

    const allPermissionsToCheck = await Promise.all(
      merchantIds.map(async (merchantId) => {
        const visiblePermissions = await getVisiblePermissions(this.page, merchantId);
        return visiblePermissions.map(({ value }) => ({ merchantId, value }));
      })
    );

    const flatPermissions = allPermissionsToCheck.flat();

    await Promise.all(
      flatPermissions.map(async ({ merchantId, value }) => {
        const checkboxTestId = `checkbox-${value}-${merchantId}`;
        const locator = this.page.getByTestId(checkboxTestId);

        await expect(locator).toBeDisabled({ timeout: 5000 });
      })
    );
  }
  // role name step assertions
  // NOTE: the create/edit role form no longer has a "current step" concept
  // (every section renders at once -- see RoleForm.tsx), so these just check
  // that the section's heading and control are present on the page.
  async assertRoleNameStepIsActive() {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleFormRoleNameSectionTitle)
    ).toBeVisible();
    await expect(this.inputRoleName).toBeVisible();
  }
  // environment step assertions
  async assertSelectEnvironmentStepIsActive() {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.roleFormEnvironmentSectionTitle)
    ).toBeVisible();
  }
  async assertProductionEnvironmentIsChecked() {
    await expect(this.checkboxProductionEnvironment).toBeChecked();
  }
  async assertSandboxEnvironmentIsChecked() {
    await expect(this.checkboxSandboxEnvironment).toBeChecked();
    await expect(this.labelSandboxSelectionInfo).toBeVisible();
  }
  async assertProductionEnvironmentIsNotChecked() {
    await expect(this.checkboxProductionEnvironment).not.toBeChecked();
  }
  async assertSandboxEnvironmentIsNotChecked() {
    await expect(this.checkboxSandboxEnvironment).not.toBeChecked();
    await expect(this.labelSandboxSelectionInfo).not.toBeVisible();
  }
  // permissions step assertions
  async assertPermissionsStepIsActive() {
    await expect(
      this.page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.permissionsStepCard)
    ).toBeVisible();
  }
  async assertResourceChecked(resource: keyof typeof RESOURCES) {
    await expect(this.checkboxResources[resource]).toBeChecked();
  }
  async assertActionChecked(action: keyof typeof ACTIONS) {
    await expect(this.checkboxActions[action]).toBeChecked();
  }
  async assertPermissionsChecked(
    merchantId: string,
    keys: (keyof typeof RESOURCES | keyof typeof ACTIONS)[]
  ): Promise<void> {
    await validatePermissionsChecked({ page: this.page, merchantId, keys });
  }
}
