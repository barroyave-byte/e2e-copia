import {
  THEME_PAYMENT_LINK_COLORS,
  THEME_PAYMENT_LINK_PATTERNS,
} from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

export const fullPaymentLinkCustomStyle = {
  theme: THEME_PAYMENT_LINK_COLORS.colors,
  ...THEME_PAYMENT_LINK_PATTERNS,
};
