import { writeFileSync, readFileSync } from 'fs';
import { AUTH_MODE_FILE_PATH } from '@support/constants/authFile';
import { AUTH_MODE } from './constants';
import type { AuthMode, AuthModeFile } from './types';

function isAuthMode(value: unknown): value is AuthMode {
  const AUTH_MODE_VALUES = Object.values(AUTH_MODE) as AuthMode[];
  return AUTH_MODE_VALUES.includes(value as AuthMode);
}

function isAuthModeFile(data: unknown): data is AuthModeFile {
  return (
    typeof data === 'object' &&
    data !== null &&
    isAuthMode((data as Record<string, unknown>).authMode)
  );
}

export function saveAuthMode(authMode: AuthMode): void {
  const content: AuthModeFile = { authMode };
  writeFileSync(AUTH_MODE_FILE_PATH, JSON.stringify(content));
}

export function readAuthMode(): AuthMode {
  try {
    const data: unknown = JSON.parse(readFileSync(AUTH_MODE_FILE_PATH, 'utf-8'));
    if (!isAuthModeFile(data)) {
      throw new Error('Invalid auth mode file');
    }
    return data.authMode;
  } catch {
    return AUTH_MODE.LEGACY;
  }
}
