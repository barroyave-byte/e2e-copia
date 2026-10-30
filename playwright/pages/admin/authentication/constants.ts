export const AUTH_MODE = {
  AUTH0: 'auth0',
  LEGACY: 'legacy',
} as const;

export const LOGIN_MODE_QUERY_PARAM = 'login_mode';
export const LOGIN_SCREEN_DETECTION_TIMEOUT = 15_000;

export const AUTH0_LOGIN_SCREEN = {
  ORG_PICKER: 'org-picker',
  OTP_SCREEN: 'otp-screen',
  MFA_CHALLENGE: 'mfa-challenge',
  REDIRECTED: 'redirected',
  TIMEOUT: 'timeout',
} as const;

export const AUTH0_LOCATORS = {
  LOGIN_FORM: {
    USERNAME_INPUT: 'input[name="username"]',
    PASSWORD_INPUT: 'input[name="password"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
  },
  ORG_PICKER: {
    SUBMIT_BUTTON: 'form button[type="submit"]',
    TITLE_TEXT: 'Choose an Organization',
  },
  MFA_CHALLENGE: {
    OTP_INPUT: 'input#code, input[inputmode="numeric"]',
    CONTINUE_BUTTON: '[data-action-button-primary="true"]',
    ERROR_MESSAGE: '#error-element-code',
  },
  OTP_ENROLLMENT: {
    TROUBLE_SCANNING_TEXT: 'Trouble Scanning?',
    COPY_CODE_TEXT: 'Copy code',
    SECRET_INPUT: '.input.multiline',
  },
} as const;

export const LOGIN_LEGACY_LOCATORS = {
  LOGIN_FORM: {
    EMAIL_INPUT_DATA_TEST_ID: 'login-input-email',
    PASSWORD_INPUT_DATA_TEST_ID: 'login-input-password',
    LOGIN_FORM_DATA_TEST_ID: 'login-form',
  },
} as const;
