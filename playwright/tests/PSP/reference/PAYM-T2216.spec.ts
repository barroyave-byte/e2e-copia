import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as crypto from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Reference Generators with Merchant Orders V2 Purchase Support', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.createVolarisReference(),
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2216 Reference Generators with Merchant Orders V2 Purchase Support',
    { tag: ['@payment_reference', '@team_payment_integration', '@preprod'] },
    async ({ page, paymentService }) => {
      await test.step('Register a new user for testing Reference Order V2', async () => {
        const email = EmailGenerator.generateRegisteredUserEmail();
        const registerUser = await apiCallNewman.registerUser(
          email,
          userData.userDataMX,
          validationUser.successUser,
          privateKey,
          merchantId
        );
        expect(registerUser).toHaveProperty('token');
        userAuthToken = registerUser.token;
      });

      await test.step('Create a Reference Order V2 with a oxxo_reference processor', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: userEmail,
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
            method_type_specific_fields: {
              reference: {
                country: 'MX',
                generators: ['oxxo_reference'],
              },
            },
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('oxxo_reference');
      });

      await test.step('Create a Reference Order V2 with a baz_reference processor', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: 'claurente@deuna.com',
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
            method_type_specific_fields: {
              reference: {
                country: 'MX',
                generators: ['baz_reference'],
              },
            },
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('baz_reference');
      });

      await test.step('Create a Reference Order V2 with oxxo_reference and baz_reference processor', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: 'claurente@deuna.com',
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
            method_type_specific_fields: {
              reference: {
                country: 'MX',
                generators: ['oxxo_reference', 'baz_reference'],
              },
            },
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('baz_reference');
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[1].reference_name
        ).toEqual('oxxo_reference');
      });

      await test.step('Create a Reference Order V2 with no reference processors sent', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: 'claurente@deuna.com',
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
            method_type_specific_fields: {
              reference: {
                country: 'MX',
                generators: [],
              },
            },
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('baz_reference');
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[1].reference_name
        ).toEqual('oxxo_reference');
      });

      await test.step('Create a Reference Order V2 with no reference structure sent', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: 'claurente@deuna.com',
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
            method_type_specific_fields: {
              reference: {
                country: 'MX',
              },
            },
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('baz_reference');
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[1].reference_name
        ).toEqual('oxxo_reference');
      });

      await test.step('Create a Reference Order V2 with a no country specific field sent', async () => {
        var payload = {
          order: {
            billing_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            currency: 'MXN',
            discounts: [
              {
                free_shipping: {
                  is_free_shipping: true,
                },
                target_type: 'shipping',
                type: 'free_shipping',
                amount: 3000,
              },
            ],
            items: [
              {
                discounts: [
                  {
                    amount: 3000,
                    ref_idx: 1,
                  },
                ],
                tax_amount: {
                  currency: 'USD',
                  currency_symbol: '$',
                },
                taxable: true,
                total_amount: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                  original_amount: 3000,
                  total_discount: 0,
                },
                unit_price: {
                  currency: 'MXN',
                  currency_symbol: '$',
                  amount: 3000,
                },
                description: 'la mejor amburguesa',
                id: '1',
                name: 'Hamburguesa con queso',
                quantity: 1,
              },
            ],
            shipping_address: {
              address1: 'presa angostura 36PH',
              address2: '',
              address_type: 'home',
              city: 'CDMX',
              country_code: 'MX',
              email: 'scatalan@deuna.com',
              first_name: 'sebastian',
              identity_document: '162915134',
              is_default: true,
              last_name: 'catalan',
              phone: '+525545014210',
              state_code: 'MX',
              state_name: 'miguel hidalgo',
              zipcode: '11500',
            },
            shipping_options: {
              type: 'delivery',
            },
            order_id: crypto.randomUUID(),
            store_code: 'all',
            sub_total: 3000,
            total_amount: 3000,
            total_tax_amount: 0,
          },
          order_type: 'DEUNA_CHECKOUT',
          payer_info: {
            email: 'claurente@deuna.com',
          },
          payment_source: {
            processor: 'volaris_reference',
            method_type: 'reference',
          },
        };

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, payload as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('processing');
        expect(purchase_v2.order.payment.data.next_action.action).toEqual(
          'reference_processor_response_fields'
        );
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[0].reference_name
        ).toEqual('baz_reference');
        expect(
          purchase_v2.order.payment.data.next_action.authorization_reference_processors
            .reference_processors[1].reference_name
        ).toEqual('oxxo_reference');
      });
    }
  );
});
