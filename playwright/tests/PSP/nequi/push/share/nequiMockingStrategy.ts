import { InterceptorRequest } from '@pages/explore/forms/formHelpers';

export interface NequiErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export interface NequiMockOptions {
  errorType?: 'validation' | 'network' | 'payment' | 'configuration';
  errorCode?: string;
  customMessage?: string;
  statusCode?: number;
  delay?: number;
}

export class NequiMockingStrategy {
  /**
   * Generates mock responses for different Nequi error scenarios
   */
  static generateErrorResponse(options: NequiMockOptions): InterceptorRequest['body'] {
    const { errorType, errorCode, customMessage, statusCode = 400 } = options;

    const errorResponses = {
      validation: {
        INVALID_PHONE_FORMAT: 'El formato del número de teléfono no es válido',
        PHONE_REQUIRED: 'El número de teléfono es requerido',
        PHONE_NOT_REGISTERED: 'El número no está registrado en Nequi',
      },
      network: {
        TIMEOUT_ERROR: 'Tiempo de espera agotado. Intenta nuevamente.',
        CONNECTION_ERROR: 'Error de conexión. Verifica tu internet.',
        SERVER_ERROR: 'Error interno del servidor. Intenta más tarde.',
      },
      payment: {
        INSUFFICIENT_FUNDS: 'Fondos insuficientes en tu cuenta Nequi',
        ACCOUNT_BLOCKED: 'Tu cuenta Nequi está temporalmente bloqueada',
        TRANSACTION_LIMIT: 'Has excedido el límite de transacción diario',
        PAYMENT_DECLINED: 'El pago fue rechazado por Nequi',
      },
      configuration: {
        PROCESSOR_NOT_CONFIGURED: 'Procesador Nequi no configurado correctamente',
        MERCHANT_NOT_ENABLED: 'Merchant no habilitado para Nequi',
        CURRENCY_NOT_SUPPORTED: 'Moneda no soportada. Solo se acepta COP',
      },
    };

    const message =
      customMessage ||
      (errorType && errorCode ? errorResponses[errorType]?.[errorCode] : '') ||
      'Error desconocido';

    return {
      data: null,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        message,
        status: statusCode,
      },
      errorException: {},
    };
  }

  /**
   * Generates success response for Nequi verification
   */
  static generateSuccessResponse(orderId?: string): InterceptorRequest['body'] {
    return {
      error: null,
      order: {
        order_id: orderId || 'test-order-id',
        transaction_id: orderId || 'test-transaction-id',
        store_code: 'all',
        currency: 'COP',
        tax_amount: 300000,
        display_tax_amount: 'COP 3.000,00',
        shipping_amount: 300000,
        display_shipping_amount: 'COP 3.000,00',
        items_total_amount: 300000,
        display_items_total_amount: 'COP 3.000,00',
        sub_total: 300000,
        display_sub_total: 'COP 3.000,00',
        total_amount: 300000,
        display_total_amount: 'COP 3.000,00',
        items: [[Object]],
        discounts: [[Object]],
        payment: {
          data: {
            acquirer_transaction_id: '',
            amount: {
              amount: 0,
              currency: '',
            },
            authorization_code: '',
            avs: null,
            created_at: '0001-01-01 00:00:00 +0000 UTC',
            customer: {
              email: '',
              first_name: '',
              id: '',
              last_name: '',
            },
            deuna_error: {
              code: '',
              message: '',
            },
            external_transaction_id: '',
            from_card: {
              bank_name: '',
              card_brand: '',
              card_type: '',
              country_iso: '',
              credential_source: '',
              expiry_month: '',
              expiry_year: '',
              first_six: '',
              last_four: '',
            },
            id: '',
            installment_interest_calculations: null,
            merchant: {
              affiliation_code: '',
              id: '',
              mcc: '',
              store_code: '',
            },
            merchant_payment_processor_id: '',
            merchant_payment_processor_name: '',
            metadata: {},
            method_type: '',
            nsu: '',
            payment_method_type: '',
            processor: '',
            reason: '',
            sca_details: null,
            status: 'processed',
            three_ds_details: {},
            tid: '',
            updated_at: '0001-01-01 00:00:00 +0000 UTC',
          },
        },
        shipping_address: {
          id: 0,
          user_id: '',
          first_name: 'qa test',
          last_name: 'automation',
          phone: '1234567893',
          identity_document: '050105010501',
          lat: -0.100032,
          lng: -78.46956,
          address1: 'test address',
          address2: '',
          city: 'Ciudad de mexico',
          zipcode: '170515',
          state_name: 'Ciudad de mexico',
          country_code: 'CO',
          additional_description: '',
          address_type: '',
          is_default: false,
          created_at: '2025-09-23T14:40:52Z',
          updated_at: '2025-09-23T14:40:52Z',
          identity_document_type: '',
          email: '',
          state_code: '',
          country: 'CO',
        },
        shipping_options: { type: 'pickup', details: [Object] },
        user_instructions: '',
        metadata: { key1: 'value1', key2: 'value2' },
        status: 'succeeded',
        gift_card: [],
        redirect_url: '',
        webhook_urls: null,
        total_discount: 0,
        display_total_discount: 'COP 0,00',
        shipping: { original_amount: 0, total_discount: 0, discounts: [] },
        cash_change: 0,
        shipping_method: {
          code: '',
          name: '',
          min_delivery_date: '',
          max_delivery_date: '',
          cost: 0,
          display_cost: '',
          tax_amount: 0,
          display_tax_amount: '',
          scheduler: [],
        },
        shipping_methods: [],
        timezone: 'America/Mexico_City',
        scheduled_at: '',
        billing_address: {
          id: 0,
          user_id: '',
          first_name: 'NELSON',
          last_name: 'JIMENEZ',
          phone: '593986100449',
          identity_document: '1150218418',
          lat: -0.100032,
          lng: -78.46956,
          address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
          address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
          city: 'Quito',
          zipcode: '170515',
          state_name: 'CRT',
          country_code: 'MX',
          additional_description: 'Descripción adicional',
          address_type: 'home',
          is_default: false,
          created_at: '2025-09-23T14:40:52Z',
          updated_at: '2025-09-23T14:40:52Z',
          email: '8451893.qa@deuna.com',
          identity_document_type: '',
          country: '',
          state_code: '',
        },
        payment_link: '',
        display_shipping_tax_amount: 'COP 0,00',
        display_total_tax_amount: 'COP 0,00',
        shipping_tax_amount: 0,
        total_tax_amount: 0,
        user_id: '',
        include_payment_options: [],
        redirect_urls: { success: '', pending: '', error: '', fallback: '', close: '' },
        created_at: '2025-09-23 14:40:52.436982542 +0000 UTC',
        updated_at: '2025-09-23 14:40:52.436982542 +0000 UTC',
        payer_info: null,
        discount_amount: 0,
        shipping_discount_amount: 0,
        device_fingerprint: '',
        expired_at: '',
        version: '0',
        fraud: null,
        total_interest_amount: 0,
        display_total_interest_amount: 'COP 0,00',
        payment_method: '',
        token: '',
        statement_descriptor: '',
        callback_urls: null,
        market_type: 'ecommerce',
        fraud_shadowmode: [],
        merchant_id: '60090b68-7de9-43af-9639-d5b0d26e4eca',
        initiator_type: 'customer',
      },
    };
  }

  /**
   * Generates pending response for Nequi verification (new immediate response behavior)
   */
  static generatePendingResponse(orderId?: string): InterceptorRequest['body'] {
    const successBody = this.generateSuccessResponse(orderId) as any;
    return {
      error: null,
      order: {
        ...successBody.order,
        status: 'pending',
      },
    };
  }

  /**
   * Common interceptor configurations for different scenarios
   */
  static getCommonInterceptors() {
    return {
      // Validation Errors
      invalidPhoneFormat: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'validation',
            errorCode: 'INVALID_PHONE_FORMAT',
          }),
        },
      },

      phoneRequired: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'validation',
            errorCode: 'PHONE_REQUIRED',
          }),
        },
      },

      phoneNotRegistered: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'validation',
            errorCode: 'PHONE_NOT_REGISTERED',
          }),
        },
      },

      // Network Errors
      timeoutError: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'network',
            errorCode: 'TIMEOUT_ERROR',
            statusCode: 408,
          }),
        },
      },

      connectionError: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'network',
            errorCode: 'CONNECTION_ERROR',
            statusCode: 503,
          }),
        },
      },

      serverError: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'network',
            errorCode: 'SERVER_ERROR',
            statusCode: 500,
          }),
        },
      },

      // Payment Errors
      insufficientFunds: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'payment',
            errorCode: 'INSUFFICIENT_FUNDS',
          }),
        },
      },

      accountBlocked: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'payment',
            errorCode: 'ACCOUNT_BLOCKED',
          }),
        },
      },

      transactionLimit: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'payment',
            errorCode: 'TRANSACTION_LIMIT',
          }),
        },
      },

      // Configuration Errors
      processorNotConfigured: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'configuration',
            errorCode: 'PROCESSOR_NOT_CONFIGURED',
            statusCode: 422,
          }),
        },
      },

      merchantNotEnabled: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'configuration',
            errorCode: 'MERCHANT_NOT_ENABLED',
            statusCode: 403,
          }),
        },
      },

      currencyNotSupported: {
        verify: {
          body: this.generateErrorResponse({
            errorType: 'configuration',
            errorCode: 'CURRENCY_NOT_SUPPORTED',
            statusCode: 422,
          }),
        },
      },

      // Success scenarios
      success: {
        verify: {
          body: this.generateSuccessResponse(),
        },
      },

      // Webhook success: simulates pending immediate response followed by succeeded after Nequi webhook
      webhookSuccess: {
        verifyWebhook: {
          pendingBody: this.generatePendingResponse(),
          successBody: this.generateSuccessResponse(),
        },
      },
    };
  }

  /**
   * Helper method to create custom error scenarios
   */
  static createCustomError(code: string, message: string, statusCode: number = 400) {
    return {
      verify: {
        body: this.generateErrorResponse({
          errorCode: code,
          customMessage: message,
          statusCode,
        }),
      },
    };
  }
}

/**
 * Utility functions for common test assertions
 */
export class NequiTestAssertions {
  /**
   * Common assertion for error scenarios where iframe should remain visible
   */
  static async assertErrorHandling(page: any, nequiPushFormPage: any, expectedErrorCode?: string) {
    await page.waitForTimeout(2000);
    await nequiPushFormPage.assertPaymentEmbedDivHasChildren();

    // TODO: Add specific error message assertions when error display is implemented
    if (expectedErrorCode) {
      // await nequiPushFormPage.assertErrorMessage(expectedErrorCode);
    }
  }

  /**
   * Common assertion for success scenarios where iframe should be hidden
   */
  static async assertSuccessHandling(page: any, nequiPushFormPage: any) {
    await nequiPushFormPage.assertNequiPushVerifyOrderStatus();
    await page.waitForTimeout(2000);
    await nequiPushFormPage.assertPaymentEmbedDivHasNoChildren();
  }
}
