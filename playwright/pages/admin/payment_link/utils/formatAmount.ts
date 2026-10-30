import type { LocaleData } from '@support/interfaces/adminPaymentLink';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';

interface FormatCurrencyParams {
  value: number;
  localeData: LocaleData;
}

export const formatAmount = ({ value, localeData }: FormatCurrencyParams): string => {
  const { locale, countryCode, currency } = localeData || {};
  const isSpanish = locale.startsWith('es');
  const validLocale = `${locale}-${countryCode}`.replace(/-\s*$/, '');

  try {
    const formattedValue = new Intl.NumberFormat(validLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    return isSpanish ? `${formattedValue.trim()} ${currency}` : formattedValue.trim();
  } catch (error) {
    console.error('Invalid currency or locale code provided:', error);
    return `${value.toFixed(2)} ${currency}`;
  }
};

export const formatAmountWithoutCurrency = (
  amount: number | string,
  locale: LanguageCodes
): string => {
  const numericAmount: number = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    console.error('Invalid amount provided:', amount);
    return `${amount}`;
  }

  try {
    const formattedValue = new Intl.NumberFormat(locale.toLowerCase(), {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);

    return formattedValue.trim();
  } catch (error) {
    console.error('Invalid currency or locale code provided:', error);
    return `${numericAmount.toFixed(2)}`;
  }
};

// Forces the thousand separator even for 4-digit integers (e.g. 'es' locale,
// where CLDR omits the group separator for 1000–9999 by default).
export const formatAmountWithGrouping = (
  amount: number | string,
  locale: LanguageCodes
): string => {
  const numericAmount: number = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    console.error('Invalid amount provided:', amount);
    return `${amount}`;
  }

  try {
    const formattedValue = new Intl.NumberFormat(locale.toLowerCase(), {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: 'always',
    }).format(numericAmount);

    return formattedValue.trim();
  } catch (error) {
    console.error('Invalid currency or locale code provided:', error);
    return `${numericAmount.toFixed(2)}`;
  }
};
