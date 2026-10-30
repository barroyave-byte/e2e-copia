import type { AUTH0_LOGIN_SCREEN, AUTH_MODE } from './constants';

export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];
export type Auth0LoginScreen = (typeof AUTH0_LOGIN_SCREEN)[keyof typeof AUTH0_LOGIN_SCREEN];
export type AuthModeFile = { authMode: AuthMode };

export interface AdminCredentials {
  email: string;
  password: string;
}
