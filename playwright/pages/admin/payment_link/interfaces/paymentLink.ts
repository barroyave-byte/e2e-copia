export interface PaymentLink {
  merchant_id: string;
  payment_link_id: string;
  payment_link_name: string;
  expires_at: string | null;
  max_completed_purchases: number | null;
  max_completed_purchases_count: number;
  max_payment_retries: number | null;
  max_payment_retries_count: number;
  payment_link_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  order: any;
  order_type: string;
  checkout_modules: any[];
}

export interface PaymentLinksResponse {
  payment_links: PaymentLink[];
  cursor: string;
  there_are_more_records: boolean;
  total: number;
}
