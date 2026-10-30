/**
 * Converts an amount to a target currency based on a country code.
 * Exchange rates are mock values and used as divisors (base → foreign).
 *
 * @param {number} amount - Amount in base currency (e.g., local units, USD).
 * @param {string} countryCode - ISO 2-letter country code (e.g., 'CO', 'MX', 'BR').
 * @returns {string} - Formatted currency string, e.g., "COP 2500.00"
 */
export function convertCurrency(amount, countryCode) {
  const exchangeRates = {
    CO: { symbol: 'COP', rate: 100 }, // 1 USD = 100 COP ⇒ divide by 100
    PE: { symbol: 'PEN', rate: 1 }, // 1:1 rate
    MX: { symbol: 'MXN', rate: 20 },
    AR: { symbol: 'ARS', rate: 200 },
    CL: { symbol: 'CLP', rate: 800 },
    US: { symbol: 'USD', rate: 4 }, // 1 USD = 4 local units
    BR: { symbol: 'BRL', rate: 5 },
  };

  const code = countryCode.toUpperCase();

  if (!exchangeRates[code]) {
    throw new Error(`Unsupported country code: ${code}`);
  }

  const { symbol, rate } = exchangeRates[code];
  const converted = amount / rate;

  return `${symbol} ${converted.toFixed(2)}`;
}
