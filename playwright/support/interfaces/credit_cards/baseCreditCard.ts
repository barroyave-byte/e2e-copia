export interface BaseCreditCard {
  number: string;
  expiration_date: string;
  cvv_code: string;
  cardholder_name: string;
  document_number: string;
}

export interface FillCardFormOptions {
  avoidInstallmentsCall?: boolean;
  type?: 'fill' | 'press';
  delayInMs?: number;
  country?: string;
}
