import { ConfigCheckoutData } from '@support/http/models/checkoutConfiguration';

export const clickToPayCheckoutConfigData: ConfigCheckoutData = {
  configuration: {
    exclude_billing_address: false,
    is_colorblind: false,
    is_identity_document_hide: false,
    hide_pickup_time: false,
    payment_credential_sources: [
      {
        type: 'click_to_pay',
        settings: {
          status: 'enabled',
          card_brands_supported: ['visa', 'mastercard', 'amex'],
          billing_preference: 'NONE',
          billing_address_priority: 'merchant',
          shipping_address_priority: 'merchant',
          checkout_experience: 'WITHIN_CHECKOUT',
          is_cvv_requested: true,
          confirm_payment: false,
          dpa_data: {
            dpa_id: '7feda78d-e258-43ca-9b7c-b3b9e2300f06_dpa4',
            dpa_locale: 'es_MX',
            dpa_name: 'Testdpa4',
            dpa_presentation_name: 'Deuna Click To Pay',
          },
          dynamic_data_type: 'NONE',
          is_consumer_email_requested: true,
          is_consumer_name_requested: true,
          is_consumer_phone_requested: true,
          onboarding_data: {
            legal_name: 'Fortcar',
            presentation_name: 'Deuna Click To Pay',
          },
          payment_options: [{ dynamic_data_type: 'NONE' }],
        },
      },
    ],
  },
  image_url: '',
  theme: {
    main_color: '',
    secondary_color: '',
    background_color: '',
  },
};
