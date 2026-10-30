import { ConfigCheckoutData, ConfigCheckoutV2Data } from '@support/http/models/checkoutConfiguration';

export const vaultWoWCheckoutConfigData: ConfigCheckoutData = {
  configuration: {
    exclude_billing_address: false,
    is_colorblind: false,
    is_identity_document_hide: false,
    hide_pickup_time: false,
  },
  image_url: '',
  theme: {
    main_color: '#5F529E',
    secondary_color: '#d9d4d4',
    background_color: '#FFFFFF',
  },
};

export const vaultWoWCheckoutConfigV2Data: ConfigCheckoutV2Data = {
  order_config: {
    notify_type: 'sync',
    payment_link: {
      custom_domain: 'https://wow.pay.stg.deuna.io',
      generate_user_auth_token: true,
    },
  },
};
