export interface TransactionTraceResponse {
  message: string;
  sub_type: string;
  audience: string;
  timestamp?: string;
  metadata: {
    contain_data: boolean;
    payload?: {
      payment_status?: string;
      refund_status?: string;
    };
    transaction_visibility: {
      event_name: string;
      destination: string;
      event_Id: string;
      event_id: string;
      time_request: number;
    };
  };
}
