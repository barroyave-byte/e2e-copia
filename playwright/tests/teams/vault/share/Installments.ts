import { Page, Response } from '@playwright/test';

/**
 * Interface for installments response data
 */
interface InstallmentOption {
  installments: number;
  installments_amount: number;
  display_installments_amount: string;
  installment_rate: number;
  display_installment_label: string;
  plan_option_id: string;
  installment_total_amount: number;
  installment_tax: [];
  display_installment_total_amount: string;
}

interface InstallmentsResponse {
  installments: InstallmentOption[];
}

/**
 * Configuration for waiting for installments response
 */
interface InstallmentsRequestConfig {
  bin: string;
  amount?: string;
  timeout?: number;
}

/**
 * Helper class to handle all installments-related operations
 * Follows Single Responsibility Principle by focusing only on installments functionality
 */
class InstallmentRequest {
  private readonly page: Page;
  private readonly DEFAULT_TIMEOUT = 60_000;
  private readonly INSTALLMENTS_ENDPOINT = '/installments';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for installments response matching the specified criteria
   * @param bin - Card BIN number
   * @param amount - Optional amount parameter
   * @param timeout - Optional custom timeout (defaults to 60000ms)
   * @returns Promise with the installments response data
   */
  async waitForResponse(
    bin: string,
    amount?: string,
    timeout?: number
  ): Promise<InstallmentsResponse> {
    const config: InstallmentsRequestConfig = {
      bin,
      amount,
      timeout: timeout ?? this.DEFAULT_TIMEOUT,
    };

    return this.page
      .waitForResponse((response) => this.matchesInstallmentsRequest(response, config), {
        timeout: config.timeout,
      })
      .then((res) => res.json());
  }

  async waitForNthResponse(
    bin: string,
    nth: number,
    timeout?: number
  ): Promise<InstallmentsResponse> {
    let count = 0;
    const config: InstallmentsRequestConfig = { bin, timeout: timeout ?? this.DEFAULT_TIMEOUT };
    return this.page
      .waitForResponse(
        (response) => {
          if (!this.matchesInstallmentsRequest(response, config)) return false;
          count++;
          return count >= nth;
        },
        { timeout: config.timeout }
      )
      .then((res) => res.json());
  }

  /**
   * Validates if response matches installments request criteria
   * Follows Single Responsibility Principle by delegating to specific validation methods
   * @private
   */
  private matchesInstallmentsRequest(
    response: Response,
    config: InstallmentsRequestConfig
  ): boolean {
    return (
      this.isInstallmentsEndpoint(response) &&
      this.hasCorrectBin(response, config.bin) &&
      this.hasCorrectAmount(response, config.amount) &&
      this.isGetMethod(response)
    );
  }

  /**
   * Checks if response is from installments endpoint
   * @private
   */
  private isInstallmentsEndpoint(response: Response): boolean {
    const url = new URL(response.url());
    return url.pathname.includes(this.INSTALLMENTS_ENDPOINT);
  }

  /**
   * Checks if response has the correct BIN parameter
   * @private
   */
  private hasCorrectBin(response: Response, bin: string): boolean {
    const url = new URL(response.url());
    const urlBin = url.searchParams.get('bin') ?? '';
    // Accept both exact match (6-digit legacy) and prefix match (8-digit BIN).
    // Passing a 6-digit prefix works in both modes: exact when the app sends 6,
    // prefix when the app sends 8.
    return urlBin === bin || urlBin.startsWith(bin);
  }

  /**
   * Checks if response has the correct amount parameter
   * @private
   */
  private hasCorrectAmount(response: Response, amount?: string): boolean {
    if (!amount) return true;
    const url = new URL(response.url());
    return url.searchParams.get('amount') === amount;
  }

  /**
   * Checks if request method is GET
   * @private
   */
  private isGetMethod(response: Response): boolean {
    return response.request().method() === 'GET';
  }

  /**
   * Finds a specific installment option by number of installments
   * @param response - The installments response data
   * @param installmentsNumber - Number of installments to find
   * @returns The matching installment option or undefined if not found
   */
  findInstallmentByNumber(
    response: InstallmentsResponse,
    installmentsNumber: number
  ): InstallmentOption | undefined {
    return response.installments.find((option) => option.installments === installmentsNumber);
  }

  /**
   * Checks if a specific installment number exists in the response
   * @param response - The installments response data
   * @param installmentsNumber - Number of installments to check
   * @returns True if the installment exists, false otherwise
   */
  hasInstallment(response: InstallmentsResponse, installmentsNumber: number): boolean {
    return this.findInstallmentByNumber(response, installmentsNumber) !== undefined;
  }

  /**
   * Gets all available installment numbers from the response
   * @param response - The installments response data
   * @returns Array of available installment numbers
   */
  getAvailableInstallmentNumbers(response: InstallmentsResponse): number[] {
    return response.installments.map((option) => option.installments);
  }

  /**
   * Validates if a pre-selected installment still exists in the new response
   * @param response - The new installments response data
   * @param preSelectedInstallments - The previously selected number of installments
   * @returns The installment option if it exists, undefined otherwise
   */
  getPreSelectedInstallment(
    response: InstallmentsResponse,
    preSelectedInstallments: number
  ): InstallmentOption | undefined {
    return this.findInstallmentByNumber(response, preSelectedInstallments);
  }
}

/**
 * Interface for installment event data from track endpoint
 */
interface InstallmentEventData {
  event: string;
  properties?: {
    metadata?: {
      cardBin?: string;
      cardIndex?: number;
      installments?: number;
      planOptionId?: string;
    };
  };
}

/**
 * Captured installment event metadata
 */
interface InstallmentEventMetadata {
  cardBin: string;
  cardIndex: number;
  installments: number;
  planOptionId: string;
}

/**
 * Options for filtering installment events
 */
interface InstallmentEventOptions {
  condition?: (postData: InstallmentEventData) => boolean;
  timeout?: number;
}

/**
 * Helper class to handle installment-related events
 * Uses waitForRequest to intercept track events
 * Follows YAGNI principle - only essential functionality
 *
 * @example
 * const events = new InstallmentEvents(page);
 *
 * // Most common use case: wait for event by BIN and cardIndex
 * const eventData = await events.waitForInstallmentSelected('123456', 0);
 * expect(eventData.installments).toBe(3);
 *
 * // Custom condition for edge cases
 * const eventData2 = await events.waitForInstallmentSelected('123456', 0, {
 *   condition: (data) => data.properties?.metadata?.installments === 3
 * });
 */
class InstallmentEvents {
  private readonly page: Page;
  private readonly DEFAULT_TIMEOUT = 40_000;
  private readonly TRACK_ENDPOINT = '/track';
  private readonly EVENT_NAME = 'onInstallmentSelected';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for onInstallmentSelected event
   * @param bin - Card BIN to filter by
   * @param cardIndex - Card index to filter by (default: 0)
   * @param options - Optional custom condition and timeout
   * @returns Promise with the event metadata
   */
  async waitForInstallmentSelected(
    bin: string,
    cardIndex: number = 0,
    options?: InstallmentEventOptions
  ): Promise<InstallmentEventMetadata> {
    const request = await this.page.waitForRequest(
      (request) => {
        if (!request.url().includes(this.TRACK_ENDPOINT) || request.method() !== 'POST') {
          return false;
        }

        try {
          const postData: InstallmentEventData = request.postDataJSON();
          console.log(`Event: ${postData.event}`);
          if (postData.event !== this.EVENT_NAME) {
            return false;
          }

          const metadata = postData.properties?.metadata;

          // Accept both exact match (6-digit legacy) and prefix match (8-digit BIN).
          // An empty bin ('') is intentional (card-deleted scenario) and matches any cardBin.
          if (!metadata || !metadata.cardBin?.startsWith(bin) || metadata.cardIndex !== cardIndex) {
            return false;
          }

          // Apply custom condition if provided
          if (options?.condition) {
            return options.condition(postData);
          }

          return true;
        } catch (error) {
          return false;
        }
      },
      { timeout: options?.timeout ?? this.DEFAULT_TIMEOUT }
    );

    const postData: InstallmentEventData = request.postDataJSON();
    return postData.properties!.metadata as InstallmentEventMetadata;
  }

  async waitForNthInstallmentSelected(
    bin: string,
    cardIndex: number = 0,
    nth: number = 2,
    options?: InstallmentEventOptions
  ): Promise<InstallmentEventMetadata> {
    let count = 0;
    return this.waitForInstallmentSelected(bin, cardIndex, {
      ...options,
      condition: (data) => {
        count++;
        if (count < nth) return false;
        if (options?.condition) return options.condition(data);
        return true;
      },
    });
  }
}

export {
  InstallmentRequest,
  InstallmentEvents,
  InstallmentOption,
  InstallmentsResponse,
  InstallmentsRequestConfig,
  InstallmentEventMetadata,
  InstallmentEventOptions,
};
