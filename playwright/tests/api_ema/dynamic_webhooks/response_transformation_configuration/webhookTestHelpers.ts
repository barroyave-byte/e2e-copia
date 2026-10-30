import { CheckoutConfigurationService } from '@support/http/services/CheckoutConfigurationService';
import { CreateCustomFieldData } from '@support/http/models/checkoutConfiguration';
import { CreateWebhookData } from '@support/http/models/checkoutConfiguration';

/**
 * Creates multiple custom fields for webhook testing
 * @param checkoutConfigurationService - The checkout configuration service instance
 * @param customFields - Array of custom field data to create
 * @param merchantId - Merchant ID
 * @param merchantToken - Merchant authentication token
 */
export async function createCustomFields(
  checkoutConfigurationService: CheckoutConfigurationService,
  customFields: CreateCustomFieldData[],
  merchantId: string,
  merchantToken: string
): Promise<void> {
  for (const customField of customFields) {
    await checkoutConfigurationService.createCustomField(
      customField,
      merchantId,
      merchantToken
    );
  }
}

/**
 * Configuration for webhook creation
 */
export interface WebhookConfig {
  data: CreateWebhookData;
  expectError?: boolean;
}

/**
 * Creates multiple webhooks for testing
 * @param checkoutConfigurationService - The checkout configuration service instance
 * @param webhooks - Array of webhook configurations to create
 * @param merchantId - Merchant ID
 * @param merchantToken - Merchant authentication token
 */
export async function createWebhooks(
  checkoutConfigurationService: CheckoutConfigurationService,
  webhooks: WebhookConfig[],
  merchantId: string,
  merchantToken: string
): Promise<void> {
  for (const webhook of webhooks) {
    await checkoutConfigurationService.createWebhook(
      merchantId,
      merchantToken,
      webhook.data,
      webhook.expectError ?? false
    );
  }
}
