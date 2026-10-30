import type { AuthMode } from '@pages/admin/authentication';
import { AUTH_MODE } from '@pages/admin/authentication/constants';
import * as dotenv from 'dotenv';
import * as path from 'path';

interface EnvConfig {
  BASE_URL_POSTMAN: string;
  /** Optional local checkout override. When unset, specs fall back to the payment_link returned by the API. */
  URL_CHECKOUT_BASE_LOCAL?: string;
  EXPLORE_URL: string;
  ADMIN_URL: string;
  NODE_ENV: string;
  MB_SESSION_TOKEN_URL: string;
  MB_USER: string;
  MB_PASSWORD: string;
  CDL_URL: string;
  TEST_CYCLE_ID: string;
  STATSIG_URL: string;
  STATSIG_API_KEY: string;
  STATSIG_FRAUD_API_KEY: string;
  STATSIG_ADMIN_API_KEY: string;
  STATSIG_PAYMENTS_API_KEY: string;
  URL_MIDDLEWARE: string;
  VTEX_MIDDLEWARE_URL: string;
  VTEX_ECOMMERCE_URL: string;
  MAILSLURP_API_KEY: string;
  LOAD_TEST_CASES_ZEPHYR_SCALE: string;
  CHATBOT_VERSION: string;
  EXPLORE_ALTERNATIVE_URL: string;
  TELCEL_MIDDLEWARE_UR_INQUIRYL: string;
  TELCEL_MIDDLEWARE_UR_NOTIFICATIONS: string;
  TRANSLATIONS_ADMIN_URL: string;
  BASE_URL_PERMIT_IO: string;
  PERMIT_TOKEN: string;
  AUTH_MODE?: AuthMode;
  SABRE_API_KEY: string;
}

export enum allowedEnvironments {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'develop',
  PRE_PRODUCTION = 'preprod',
}

const OREGON_REGIONAL_PROD = 'oregon-regional-prod';
const currentEnv = process.env.NODE_ENV || allowedEnvironments.STAGING;
const runtimeEnv =
  currentEnv === OREGON_REGIONAL_PROD ? allowedEnvironments.PRODUCTION : currentEnv;

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${currentEnv}`),
});

dotenv.config({
  path: path.resolve(process.cwd(), `.env`),
  override: currentEnv !== OREGON_REGIONAL_PROD,
});

function getEnv(): EnvConfig {
  return {
    NODE_ENV: runtimeEnv,
    BASE_URL_POSTMAN: process.env.BASE_URL_POSTMAN || 'https://api.stg.deuna.io',
    URL_CHECKOUT_BASE_LOCAL: process.env.URL_CHECKOUT_BASE_LOCAL,
    EXPLORE_URL: process.env.EXPLORE_URL || 'https://explore.stg.deuna.io/',
    ADMIN_URL: process.env.ADMIN_URL || 'https://admin.stg.deuna.io',
    MB_SESSION_TOKEN_URL:
      process.env.MB_SESSION_TOKEN_URL || 'https://insights.deuna.com/api/session',
    MB_USER: process.env.MB_USER,
    MB_PASSWORD: process.env.MB_PASSWORD,
    CDL_URL: process.env.CDL_URL || 'https://cdn.stg.deuna.io',
    TEST_CYCLE_ID: process.env.TEST_CYCLE_ID,
    STATSIG_API_KEY: process.env.STATSIG_API_KEY,
    STATSIG_FRAUD_API_KEY: process.env.STATSIG_FRAUD_API_KEY,
    STATSIG_PAYMENTS_API_KEY: process.env.STATSIG_PAYMENTS_API_KEY,
    STATSIG_ADMIN_API_KEY: process.env.STATSIG_ADMIN_API_KEY,
    STATSIG_URL: process.env.STATSIG_URL || 'https://statsigapi.net',
    URL_MIDDLEWARE: process.env.URL_MIDDLEWARE || 'https://middleware.dev.deuna.io',
    VTEX_MIDDLEWARE_URL:
      process.env.VTEX_MIDDLEWARE_URL || 'https://api.dev.deuna.io/payments-middleware',
    VTEX_ECOMMERCE_URL:
      process.env.VTEX_ECOMMERCE_URL || 'https://stg--deunapartnerglobal.myvtex.com',
    MAILSLURP_API_KEY: process.env.MAILSLURP_API_KEY || 'PERSONAL_KEY',
    LOAD_TEST_CASES_ZEPHYR_SCALE: process.env.LOAD_TEST_CASES_ZEPHYR_SCALE || 'false',
    CHATBOT_VERSION: process.env.CHATBOT_VERSION || 'v3_9',
    EXPLORE_ALTERNATIVE_URL:
      process.env.EXPLORE_ALTERNATIVE_URL || 'https://pre-staging.d194dyh79btqyl.amplifyapp.com/',
    TELCEL_MIDDLEWARE_UR_INQUIRYL:
      process.env.TELCEL_MIDDLEWARE_UR_INQUIRYL ||
      'https://api.stg.deuna.io/telcel-middleware/transactions/inquiry',
    TELCEL_MIDDLEWARE_UR_NOTIFICATIONS:
      process.env.TELCEL_MIDDLEWARE_UR_NOTIFICATIONS ||
      'https://telcel-middleware.stg.deuna.io/api/v1/transactions/notifications',
    TRANSLATIONS_ADMIN_URL:
      process.env.TRANSLATIONS_ADMIN_URL || 'https://translations.stg.deuna.io',
    BASE_URL_PERMIT_IO: process.env.BASE_URL_PERMIT_IO || 'https://api.permit.io',
    PERMIT_TOKEN: process.env.PERMIT_TOKEN,
    AUTH_MODE: (process.env.AUTH_MODE || AUTH_MODE.LEGACY) as AuthMode,
    SABRE_API_KEY: process.env.SABRE_API_KEY,
  } as EnvConfig;
}

const envConfig = getEnv();
export default envConfig;
