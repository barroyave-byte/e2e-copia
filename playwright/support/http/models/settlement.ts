export interface CreateBatchBody {
  processor_id: number;
  merchant_id: string;
  filter_merchant_payment_processor: boolean;
}

export interface CreateBatchResponse {
  batch_id: string;
  batch_external_reference_id: string;
  status: string;
  processor_id: string;
  processor_name: string;
  filter_merchant_payment_processor: string;
  file_base: {
    folder: string;
    date: string;
    name: string;
  };
}

export interface StatusBatchFileBody {
  file_key: string;
}

export interface StatusBatchFileResponse {
  success: boolean;
  size: number;
  num_transactions: number;
}

export interface GetBatchResponse {
  id: string;
  batch_id: string;
  status: string;
  processor_id: string;
  filter_merchant_payment_processor: string;
  batch_external_reference_id: string;
}

export interface UploadFileBody {
  file_content_base64: string;
}
