import { allowedEnvironments } from '@support/envConfig';

export const devMerchants = {
  cinepolis: '8dbe50ba-529d-4c74-8c72-e713ec9c79e0',
};

export const stgMerchants = {
  doto: '3cfc0f50-06df-45e5-ace8-ad4e49191c71',
};

export const prodMerchants = {
  greatful: '3e2bb759-70b1-413d-b3c4-d8a38cea5b42',
};

export const reconMerchants = {
  production: '37e21ead-3951-4cbc-b075-9c635f4b8933',
  staging: '37e21ead-3951-4cbc-b075-9c635f4b8933',
  default: '37e21ead-3951-4cbc-b075-9c635f4b8933',
};

export const merchantIDByEnviroment: Readonly<Record<allowedEnvironments, string>> = {
  [allowedEnvironments.DEVELOPMENT]: devMerchants.cinepolis,
  [allowedEnvironments.STAGING]: stgMerchants.doto,
  [allowedEnvironments.PRE_PRODUCTION]: devMerchants.cinepolis,
  [allowedEnvironments.PRODUCTION]: prodMerchants.greatful,
};

export type ScheduleReportType = 'reconciliations' | 'orders';

export enum reportTypes {
  merchant_report = 'Fuente del comercio',
  settlement_transactions = 'Liquidación de transacciones',
  settlement_taxes = 'Liquidación de impuestos',
}

export const GET_FILTERS_PATH = '/filters/settlements/merchants/.*';
export const GET_FIELDS_PATH = '/merchants/.*/reports/fields';
export const POST_SCHEDULE_REPORT_PATH = '/merchants/.*/reports/schedules';
export const DEFAULT_SUPERADMIN_EMAIL = 'developers@getduna.com';
export const DEFAULT_SUPERADMIN_PASSWORD = 'superadmin';
export const MERCHANT_SESSION_STORAGE_KEY = 'merchant-selectedMerchantId';
export const ADMIN_DEFAULT_PASSWORD = '123456';
