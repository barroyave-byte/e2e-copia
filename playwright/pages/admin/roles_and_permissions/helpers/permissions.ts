import {
  RESOURCES,
  ACTIONS,
  ROLES_AND_PERMISSIONS_DATA_TEST_IDS,
  ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS,
} from '@pages/admin/constants/rolesAndPermissions';
import { Page, expect } from '@playwright/test';

export type PermissionKey = keyof typeof RESOURCES | keyof typeof ACTIONS;
export type PermissionValue =
  | (typeof RESOURCES)[keyof typeof RESOURCES]
  | (typeof ACTIONS)[keyof typeof ACTIONS];
interface PermissionItem {
  type: 'resource' | 'action';
  key: string;
  value: string;
}

interface CheckboxParams {
  page: Page;
  key: PermissionKey;
  merchantId: string;
}

type ValidatePermissionsCheckedParams =
  | {
      page: Page;
      merchantId: string;
      keys: PermissionKey[];
      values?: never;
    }
  | {
      page: Page;
      merchantId: string;
      values: PermissionValue[];
      keys?: never;
    };

export function getAllPermissions(): PermissionItem[] {
  return [
    ...Object.entries(RESOURCES).map(([key, value]) => ({
      type: 'resource' as const,
      key,
      value,
    })),
    ...Object.entries(ACTIONS).map(([key, value]) => ({
      type: 'action' as const,
      key,
      value,
    })),
  ];
}

const pendingExpansions = new WeakMap<Page, Promise<void>>();

// Merchant columns share section toggles. Concurrent callers must share one expansion.
export async function expandAllPermissionResources(page: Page): Promise<void> {
  const pending = pendingExpansions.get(page);
  if (pending) return pending;

  const expansion = (async () => {
    for (const resourceValue of Object.values(RESOURCES)) {
      const header = page.getByTestId(
        ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.collapseHeaderTitle(resourceValue)
      );
      if (!(await header.isVisible())) continue;
      if ((await header.getAttribute('aria-expanded')) === 'true') continue;
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
    }
  })();
  pendingExpansions.set(page, expansion);
  try {
    await expansion;
  } finally {
    pendingExpansions.delete(page);
  }
}

export async function getVisiblePermissions(
  page: Page,
  merchantId: string
): Promise<PermissionItem[]> {
  await expandAllPermissionResources(page);
  const allPermissions = getAllPermissions();
  const visible: PermissionItem[] = [];

  for (const { value, key, type } of allPermissions) {
    const checkboxId = `checkbox-${value}-${merchantId}`;
    const locator = page.getByTestId(checkboxId);
    if (await locator.isVisible()) {
      visible.push({ key, value, type });
    }
  }

  return visible;
}

export async function togglePermissionCheckbox({
  page,
  key,
  merchantId,
  check,
}: CheckboxParams & { check: boolean }) {
  const value = RESOURCES[key as keyof typeof RESOURCES] ?? ACTIONS[key as keyof typeof ACTIONS];
  await expandAllPermissionResources(page);
  const checkboxId = `checkbox-${value}-${merchantId}`;
  const locator = page.getByTestId(checkboxId);
  await expect(locator, `The permission checkbox ${checkboxId} is not visible`).toBeVisible({
    timeout: 40000,
  });
  const isChecked = await locator.getAttribute('aria-checked');
  const currentlyChecked = isChecked === 'true';

  if (currentlyChecked !== check) {
    await locator.click();
  }
}

export async function validatePermissionsChecked({
  page,
  merchantId,
  keys,
  values,
}: ValidatePermissionsCheckedParams) {
  await expandAllPermissionResources(page);
  const resolvedValues: PermissionValue[] = values
    ? values
    : keys.map(
        (key) => RESOURCES[key as keyof typeof RESOURCES] ?? ACTIONS[key as keyof typeof ACTIONS]
      );

  for (const value of resolvedValues) {
    const checkboxId = `checkbox-${value}-${merchantId}`;

    const locator = page.getByTestId(checkboxId);

    await expect(locator).toHaveAttribute('aria-checked', 'true', {
      timeout: 5000,
    });
  }
}

export async function checkRandomPermissions(
  page: Page,
  merchantId: string,
  total: number = 3
): Promise<(keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
  await expandAllPermissionResources(page);
  const allPermissions = getAllPermissions();
  const visiblePermissions: PermissionItem[] = [];

  for (const item of allPermissions) {
    const checkboxId = `checkbox-${item.value}-${merchantId}`;
    const locator = page.getByTestId(checkboxId);

    if (await locator.isVisible()) {
      visiblePermissions.push(item);
    }
  }

  if (visiblePermissions.length < total) {
    throw new Error(
      `Not enough visible permissions for merchant ${merchantId}. Needed: ${total}, found: ${visiblePermissions.length}`
    );
  }

  const shuffled = [...visiblePermissions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, total);
  const checkedKeys: (keyof typeof RESOURCES | keyof typeof ACTIONS)[] = [];

  for (const { key, value } of selected) {
    const checkboxId = `checkbox-${value}-${merchantId}`;
    const locator = page.getByTestId(checkboxId);

    await expect(locator).toBeVisible({ timeout: 5000 });
    await expect(locator).toBeEnabled({ timeout: 5000 });

    const isChecked = await locator.getAttribute('aria-checked');
    if (isChecked !== 'true') {
      await locator.scrollIntoViewIfNeeded();

      const maxAttempts = 3;
      let currentState = isChecked;

      for (let attempt = 0; attempt < maxAttempts && currentState !== 'true'; attempt++) {
        await locator.click({
          force: attempt > 0,
          timeout: 5000,
        });

        // Wait for the checkbox state to change instead of fixed timeout
        try {
          await expect(locator).toHaveAttribute('aria-checked', 'true', { timeout: 2000 });
          currentState = 'true';
          break;
        } catch (error) {
          // Attribute didn't change, get current state for next iteration
          currentState = await locator.getAttribute('aria-checked');
        }
      }

      if (currentState !== 'true') {
        throw new Error(
          `Failed to check ${checkboxId} after ${maxAttempts} attempts. Final state: ${currentState}`
        );
      }
    }

    await expect(locator).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
    checkedKeys.push(key as keyof typeof RESOURCES | keyof typeof ACTIONS);
  }

  return checkedKeys;
}

/**
 * Unchecks every permission of the merchant column. Each resource section starts collapsed and
 * its checkboxes stay hidden until it is expanded: without expanding first, every checkbox read
 * as not visible, nothing was unchecked and the edited role kept its original permissions
 * (ADM-T567).
 */
export async function uncheckAllPermissions(page: Page, merchantId: string): Promise<void> {
  await expandAllPermissionResources(page);

  for (const { value } of getAllPermissions()) {
    const checkbox = page.getByTestId(`checkbox-${value}-${merchantId}`);
    if (!(await checkbox.isVisible())) continue;
    if ((await checkbox.getAttribute('aria-checked')) !== 'true') continue;
    await checkbox.click();
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');
  }
}

export async function checkAllColumnMerchantPermissions(
  page: Page,
  merchantId: string
): Promise<(keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
  const checkboxTestId = `${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.permissionsStepColumnHeaderCheckbox}-${merchantId}`;
  const checkboxButton = page.getByTestId(checkboxTestId);
  await checkboxButton.click();
  await expect(checkboxButton).toBeChecked();

  const visiblePermissions = await getVisiblePermissions(page, merchantId);
  const checkedKeys = visiblePermissions.map(
    ({ key }) => key as keyof typeof RESOURCES | keyof typeof ACTIONS
  );

  return checkedKeys;
}

export function mapRoleResourcesToPermissions(
  raw: string
): Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> {
  const parsed = JSON.parse(raw) as Array<{
    merchant_id: string;
    permissions: string[];
  }>;

  const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};

  for (const { merchant_id, permissions: perms } of parsed) {
    if (!permissions[merchant_id]) {
      permissions[merchant_id] = [];
    }

    for (const permission of perms) {
      const [resource, action] = permission.split('_');

      if (resource in RESOURCES) {
        permissions[merchant_id].push(resource as keyof typeof RESOURCES);
      }

      if (action in ACTIONS) {
        permissions[merchant_id].push(action as keyof typeof ACTIONS);
      }
    }
  }

  return permissions;
}
