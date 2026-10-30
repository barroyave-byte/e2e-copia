export interface LocaleData {
  locale: string;
  countryCode: string;
  currency: string;
}

export interface Amounts {
  taxAmount: string;
  shippingAmount: string;
  productsAmount: number;
}

export interface CustomUrls {
  successUrl?: string;
  pendingUrl?: string;
  errorUrl?: string;
}

export interface Product {
  productName: string;
  productAmount: string;
}
