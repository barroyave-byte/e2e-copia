import { EDIT_BUTTON_IDS } from '@pages/admin/constants/rolesAndPermissions';

export interface MerchantUserV3RoleResponse {
  isOk: boolean;
  Name: string;
  roleID: string;
  roleEnvironments: string;
  roleResources: string;
}

export type EditButtonIds = (typeof EDIT_BUTTON_IDS)[keyof typeof EDIT_BUTTON_IDS];
