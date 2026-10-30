export interface GenerateUserBody {
  must_save: boolean;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface GenerateUserResponse {
  user_token: string;
  user_id: string;
}

export interface GuestLoginRequest {
  merchant_id: string;
  user_id: string;
}

export interface GuestLoginResponse {
  token: string;
}

export interface CreateNetworkRequest {
  data: createNetworkData;
  merchantToken: string;
}

interface createNetworkData {
  name: string;
  is_private: boolean;
  parent_account_enabled?: boolean;
}

export interface CreateNetworkResponse {
  id: string;
  name: string;
  is_private: boolean;
  merchants: [];
  parent_account_enabled: boolean;
}

export interface MerchantToNetworkRequest {
  merchant_id: string;
  network_id: string;
  merchantToken: string;
}

export interface MerchantToNetworkResponse {
  id: string;
  merchant_id: string;
  network_id: string;
  network: {
    id: string;
    name: string;
    is_private: boolean;
    merchants: null;
    parent_account_enabled: boolean;
  };
}

export interface RegisterUserRequest {
  merchantPrivateKey?: string;
  merchantId: string;
  data: RegisterUserRequestData;
}

export interface RegisterUserRequestData {
  email: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  identity_document: string;
  merchant_id?: string;
}

export interface RegisterUserResponse {
  token: string;
  user_id: string;
}

export interface AddressUserRequest {
  user_id: string;
  userToken: string;
  merchantId: string;
  data: AddressUserRequestData;
}
export interface AddressUserRequestData {
  additional_description: string;
  address1: string;
  address2: string;
  address_type: string;
  city: string;
  country: string;
  first_name: string;
  identity_document: string;
  is_billing_address: boolean;
  is_default: boolean;
  last_name: string;
  lat: number;
  lng: number;
  phone: string;
  state_name: string;
  zipcode: string;
}
export interface AddressUserResponse {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  identity_document: string;
  lat: number;
  lng: number;
  address1: string;
  address2: string;
  city: string;
  zipcode: string;
  state_name: string;
  state_code: string | null;
  country: string;
  additional_description: string;
  address_type: string;
  is_default: boolean;
  is_billing_address: boolean;
  email: string | null;
  network_id: string | null;
  created_at: string;
  updated_at: string;
  identification_type: string;
}

export interface UserCardRequest {
  userId: string;
  userToken: string;
  data: UserCardRequestData;
}

export interface UserCardRequestData {
  address1: string;
  card_cvv: string;
  card_holder: string;
  card_holder_dni: string;
  card_number: string;
  city: string;
  country: string;
  expiry_month: string;
  expiry_year: string;
  phone: string;
  state: string;
  zip: string;
  verify_card?: boolean | null;
  fraud_config?: {
    invoke_fraud_checkpoint?: boolean;
  };
  card_verification_config?: {
    invoke_card_verification?: boolean | string;
  };
}

export interface UserCardResponse {
  data: {
    id: string;
    user_id: string;
    card_holder: string;
    card_holder_dni: string;
    company: string;
    last_four: string;
    first_six: string;
    expiration_date: string;
    is_valid: boolean;
    is_expired: boolean;
    verified_by: string;
    verified_with_transaction_id: string;
    verified_at: string;
    last_used: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    bank_name: string;
    country_iso: string;
    card_type: string;
    source: string;
    zip_code: string;
    is_default: boolean | null;
    vault: boolean | null;
  };
}

export interface LoginUserTypeSmsResponse {
  token: string;
  refresh_token: string;
}

export interface RegisterUserAndSetAddressResponse {
  user: RegisterUserResponse;
  address: AddressUserResponse;
}

/** Body of GET /users/{userId}/cards — the endpoint at fault in RIS-132 (SQLSTATE 22007 on a corrupted expiration_date). */
export interface UserCardListResponse {
  data: UserCardResponse['data'][];
}

export interface LoginDeviceFingerprintResponse {
  token: string;
  refresh_token: string;
  'user-deuna': boolean;
}

interface MerchantWithPermissions {
  merchant_id: string;
  permissions: string[];
}

interface MerchantUserAllowedActions {
  network_id?: string;
  environments: string[];
  merchants: MerchantWithPermissions[];
}

export interface CreateMerchantUserWithNetworkBody {
  email: string;
  password: string;
  name: string;
  role: string;
  store_code: string;
  merchants_ids: string[];
  network_id: string;
  phone: string;
  allowed_actions: MerchantUserAllowedActions;
}

export interface CreateMerchantUserWithoutNetworkBody {
  email: string;
  name: string;
  password: string;
  role: string;
  store_code: string;
  merchants_ids: string[];
  phone: string;
  allowed_actions: MerchantUserAllowedActions;
}

export interface CreateMerchantRoleBody {
  role_name: string;
  network_id: string;
  environments: string[];
  merchants: MerchantWithPermissions[];
}

export interface CreateMerchantRoleApiResponse {
  name: string;
  parent_id: string;
  environments: string[];
  merchants: MerchantWithPermissions[];
}
