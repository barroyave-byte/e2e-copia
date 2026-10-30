import { MERCHANT_LOGO_V2_BODY } from './MerchantLogoConfig';

export const VOUCHER_LOGO_V2_BODY = {
  order_config: {
    voucher_configuration: {
      voucher_logo: MERCHANT_LOGO_V2_BODY.widgets_general_config.theme.image.base64,
    },
  },
};

export const VOUCHER_LOGO_ORDER_CONFIG = VOUCHER_LOGO_V2_BODY.order_config;
