import { CommonsActions } from '@pages/commonActions';
import { Page } from '@playwright/test';
import { Providers } from './interfaces';

type FieldType = 'input' | 'checkbox';

interface FieldConfig {
  name: string;
  type?: FieldType;
  customSelector?: string;
  checkboxOnlyIfTrue?: boolean;
}

type SimpleFieldConfig = string | FieldConfig;

interface ProviderConfig {
  fields: SimpleFieldConfig[];
}

/**
 * The selectors are generated automatically as: #provider-{provider}-{fieldname}
 * If the fieldname is not a valid CSS selector, you can specify a custom selector in the field configuration.
 * If the field is a checkbox, you can specify a checkboxOnlyIfTrue: true to only click the checkbox if the value is true.
 * Example of a field with a custom selector for the provider 'provider-name':
 * 'PROVIDER_NAME': {
 *   fields: [
 *     'field1',
 *     'field2',
 *     {
 *       name: 'field3',
 *       type: 'input',
 *       customSelector: '#provider-provider-name-field-name-3',
 *     },
 *   ],
 * },
 *
 */
const FRAUD_PROVIDERS_CONFIG: Partial<Record<Providers, ProviderConfig>> = {
  KOUNT: {
    fields: [
      'dataCollectorUrl',
      'merchantId',
      'clientId',
      'environment',
      {
        name: 'isSinglePageApp',
        type: 'checkbox',
        checkboxOnlyIfTrue: true,
      },
    ],
  },
  KOIN: {
    fields: ['orgId'],
  },
  SIGNIFYD: {
    fields: ['account', 'email'],
  },
};

/**
 * Class to fill the form of the fraud providers
 */
export class FraudProviderPage extends CommonsActions {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Generate the standard CSS selector for a field of the provider
   * Pattern: #provider-{provider-name}-{fieldname}
   */
  private generateSelector(provider: Providers, fieldName: string): string {
    const providerLower = provider.toLowerCase().replace(/_/g, '-');
    const fieldLower = fieldName.toLowerCase();

    return `#provider-${providerLower}-${fieldLower}`;
  }

  /**
   * Normalize the field configuration (string or object) to a complete object
   */
  private normalizeFieldConfig(field: SimpleFieldConfig): FieldConfig {
    if (typeof field === 'string') {
      return {
        name: field,
        type: 'input',
      };
    }
    return {
      type: 'input',
      ...field,
    };
  }

  /**
   * Fill the form of a fraud provider using the configuration
   * @param provider - Provider name (e.g: 'KOUNT', 'KOIN', 'SIGNIFYD')
   * @param data - Data to fill (e.g: { clientId: '1234567890', isSinglePageApp: true })
   */
  async fillForm(provider: Providers, data: Record<string, string | boolean>): Promise<void> {
    const config = FRAUD_PROVIDERS_CONFIG[provider];

    if (!config) {
      console.error(`No configuration found for provider: ${provider}`);
      return;
    }

    for (const fieldConfig of config.fields) {
      const field = this.normalizeFieldConfig(fieldConfig);
      const value = data[field.name];

      if (value === undefined || value === null) {
        continue;
      }

      const selector = field.customSelector || this.generateSelector(provider, field.name);
      const locator = this.page.locator(selector);

      await locator.waitFor({ state: 'visible' });

      switch (field.type) {
        case 'input':
          if (typeof value === 'string') {
            await this.fillInputField(locator, value);
          }
          break;

        case 'checkbox':
          if (field.checkboxOnlyIfTrue && value === true) {
            await this.ensureVisibleToClick(locator);
          }
          break;

        default:
          console.error(`Unknown field type: ${field.type}`);
      }
    }
  }
}
