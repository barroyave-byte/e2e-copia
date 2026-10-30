/**
 * Shipping rate webhook URLs for DEUNA_CHECKOUT orders.
 * Reference these constants in countryData or pass them directly as
 * `shipping_rate` in DeunacheckoutOrderOptions to override per test case.
 */
export const SHIPPING_RATE_URLS = {
  MEXICO: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/order/mexico',
  COLOMBIA: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/order/colombia',
  CHILE: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/order/chile',
  ECUADOR: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/order/ecuador',
  MEXICO_MSI: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/order/mexico/msi_paypalACDC',
  WITHOUT_COVERAGE: 'https://9e9143d0-87cc-4dd8-9a67-79c4e14e94fa.mock.pstmn.io/shipping_rate/without_coverage',
} as const;

export type ShippingRateUrl = (typeof SHIPPING_RATE_URLS)[keyof typeof SHIPPING_RATE_URLS];
