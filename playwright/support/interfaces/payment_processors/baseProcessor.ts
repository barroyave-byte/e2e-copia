export interface BaseProcessor {
  // fields for payment processors
  name: string;
  payment_processor_id?: number;
  enabled?: boolean;
  country_iso?: string;
  currency_iso3?: string;
  public_api_key?: string;
  private_api_key?: string;
  automatic_capture?: boolean;
  external_merchant_id?: string;
  acquirer_id?: string;
  merchant_pwd?: string;
  extra_params?: {};
  authorization_association_mode?: string;
  three_ds_processing_provider?: string;
  enable_3ds_authentication?: boolean;
  three_ds_specific_fields?: {};

  flow?: string;
  flow_version?: string;
  three_ds_internal_version?: string;

  // Multiple Partial Capture (MPC) fields
  multiple_partial_capture?: boolean;
  multiple_partial_capture_mode?: string;
  // Multiple Partial Refund (MPR) fields
  multiple_partial_refund?: boolean;
  // Transaction config fields. Used for both MPC and MPR
  transaction_config?: {
    capture_cutoff_days?: number;
    refund_cutoff_days?: number;
  };

  // fields for fraud processors
  processor_id?: number;
  processor_name?: string;
  properties?: { metadata_id: number; label: string; property_name: string }[];
}

/**
 * Fraud processors (Sift, Signifyd, Cybersource, Kount, Riskified, Clearsale, Accertify).
 *
 * They were previously typed as `BaseProcessor`, which forced every payment-processor field
 * — including `name` — to stay optional even though a payment processor always has one.
 * Fraud processors identify themselves with `processor_name` and never carry `name`, so they
 * get their own shape. Making `properties` required here also fixes the call sites that
 * already index it directly (e.g. `siftFraudProcessor.properties[0].property_name`).
 */
export interface FraudProcessor {
  processor_id: number;
  processor_name: string;
  properties: { metadata_id: number; label: string; property_name: string }[];
}

/**
 * What the admin Connections pages accept. That UI configures both payment and fraud
 * connections through the same entry point (`configureConnection(..., 'fraud')`), so its
 * signatures take either shape rather than forcing one interface to be the loose union of
 * both — which is what kept `BaseProcessor.name` optional and produced 504 of the repo's
 * strict-mode errors.
 */
export type ConnectionProcessorData = BaseProcessor | FraudProcessor;
