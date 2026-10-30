import envConfig from '@support/envConfig';

import { AUTH_MODE, LOGIN_MODE_QUERY_PARAM } from '../constants';
import type { AuthMode } from '../types';

export function buildAdminLoginUrl(authMode: AuthMode): string {
  const url = new URL(envConfig.ADMIN_URL);
  if (authMode === AUTH_MODE.AUTH0) {
    url.searchParams.set(LOGIN_MODE_QUERY_PARAM, AUTH_MODE.AUTH0);
  } else if (authMode === AUTH_MODE.LEGACY) {
    url.searchParams.set(LOGIN_MODE_QUERY_PARAM, AUTH_MODE.LEGACY);
  }
  return url.toString();
}
