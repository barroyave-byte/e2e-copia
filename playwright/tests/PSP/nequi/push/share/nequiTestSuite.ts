import { test, Page } from '@support/fixtures';
import { NequiPushPaymentFlowUntilPhoneVerification } from './nequiPushPaymentFlowUntilPhoneVerification';
import { NequiMockingStrategy, NequiTestAssertions } from './nequiMockingStrategy';

/**
 * Comprehensive test suite for Nequi Push scenarios
 * Provides reusable test functions for all error and success scenarios
 */
export class NequiTestSuite {
  private nequiFlow: NequiPushPaymentFlowUntilPhoneVerification;

  constructor() {
    this.nequiFlow = new NequiPushPaymentFlowUntilPhoneVerification();
  }

  /**
   * Setup methods for test initialization
   */
  setupGlobal() {
    this.nequiFlow.globalSetup();
  }

  setupTest() {
    this.nequiFlow.testSetup();
  }

  /**
   * Generic error test runner
   */
  async runErrorScenario(
    page: Page,
    errorType: keyof ReturnType<typeof NequiMockingStrategy.getCommonInterceptors>,
    expectedErrorCode?: string
  ) {
    const interceptors = NequiMockingStrategy.getCommonInterceptors();

    const { nequiPushFormPage } = await this.nequiFlow.run({
      page,
      options: {
        interceptors: interceptors[errorType],
      },
    });

    await NequiTestAssertions.assertErrorHandling(page, nequiPushFormPage, expectedErrorCode);
    return { nequiPushFormPage };
  }

  /**
   * Success scenario runner — simulates the Nequi webhook flow:
   * verify returns 'pending' on the first call (new immediate response), then 'succeeded'
   * after the Nequi webhook is processed.
   */
  async runSuccessScenario(page: Page) {
    const interceptors = NequiMockingStrategy.getCommonInterceptors();
    const { nequiPushFormPage } = await this.nequiFlow.run({
      page,
      options: {
        interceptors: interceptors.webhookSuccess,
      },
    });
    await NequiTestAssertions.assertSuccessHandling(page, nequiPushFormPage);
    return { nequiPushFormPage };
  }

  /**
   * Custom error scenario runner
   */
  async runCustomErrorScenario(
    page: Page,
    errorCode: string,
    errorMessage: string,
    statusCode: number = 400
  ) {
    const customInterceptor = NequiMockingStrategy.createCustomError(
      errorCode,
      errorMessage,
      statusCode
    );

    const { nequiPushFormPage } = await this.nequiFlow.run({
      page,
      options: {
        interceptors: customInterceptor,
      },
    });

    await NequiTestAssertions.assertErrorHandling(page, nequiPushFormPage, errorCode);
    return { nequiPushFormPage };
  }

  /**
   * Predefined test scenarios for easy reuse
   */
  static getTestScenarios() {
    return {
      // Validation errors
      invalidPhoneFormat: {
        interceptorKey: 'invalidPhoneFormat' as const,
        expectedError: 'INVALID_PHONE_FORMAT',
        description: 'Invalid phone number format error',
      },
      phoneRequired: {
        interceptorKey: 'phoneRequired' as const,
        expectedError: 'PHONE_REQUIRED',
        description: 'Empty phone number validation error',
      },
      phoneNotRegistered: {
        interceptorKey: 'phoneNotRegistered' as const,
        expectedError: 'PHONE_NOT_REGISTERED',
        description: 'Phone number not registered in Nequi',
      },

      // Network errors
      timeoutError: {
        interceptorKey: 'timeoutError' as const,
        expectedError: 'TIMEOUT_ERROR',
        description: 'Timeout error during phone verification',
      },
      connectionError: {
        interceptorKey: 'connectionError' as const,
        expectedError: 'CONNECTION_ERROR',
        description: 'Network connection error',
      },
      serverError: {
        interceptorKey: 'serverError' as const,
        expectedError: 'SERVER_ERROR',
        description: 'Internal server error',
      },

      // Payment errors
      insufficientFunds: {
        interceptorKey: 'insufficientFunds' as const,
        expectedError: 'INSUFFICIENT_FUNDS',
        description: 'Insufficient funds in Nequi account',
      },
      accountBlocked: {
        interceptorKey: 'accountBlocked' as const,
        expectedError: 'ACCOUNT_BLOCKED',
        description: 'Nequi account blocked or suspended',
      },
      transactionLimit: {
        interceptorKey: 'transactionLimit' as const,
        expectedError: 'TRANSACTION_LIMIT',
        description: 'Transaction limit exceeded',
      },

      // Configuration errors
      processorNotConfigured: {
        interceptorKey: 'processorNotConfigured' as const,
        expectedError: 'PROCESSOR_NOT_CONFIGURED',
        description: 'Nequi processor not configured correctly',
      },
      merchantNotEnabled: {
        interceptorKey: 'merchantNotEnabled' as const,
        expectedError: 'MERCHANT_NOT_ENABLED',
        description: 'Merchant not enabled for Nequi',
      },
      currencyNotSupported: {
        interceptorKey: 'currencyNotSupported' as const,
        expectedError: 'CURRENCY_NOT_SUPPORTED',
        description: 'Currency not supported (non-COP)',
      },
    };
  }
}
