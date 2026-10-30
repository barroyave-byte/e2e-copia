import { BaseService } from './BaseService';
import { EndpointConfig } from '../config/EndpointConfig';
import { RegisterService } from '../decorators/ServiceDecorator';
import { SERVICE_KEYS } from '../types/ServiceTypes';
import { randomUUID } from 'crypto';
import { DEFAULT_ADDRESS_DATA, DEFAULT_USER_DATA } from '../testData/user_auth';
import {
  AddressUserRequest,
  AddressUserRequestData,
  AddressUserResponse,
  CreateMerchantRoleApiResponse,
  CreateMerchantRoleBody,
  CreateMerchantUserWithNetworkBody,
  CreateMerchantUserWithoutNetworkBody,
  CreateNetworkRequest,
  CreateNetworkResponse,
  GenerateUserBody,
  GenerateUserResponse,
  GuestLoginRequest,
  GuestLoginResponse,
  LoginDeviceFingerprintResponse,
  LoginUserTypeSmsResponse,
  MerchantToNetworkRequest,
  MerchantToNetworkResponse,
  RegisterUserRequest,
  RegisterUserRequestData,
  RegisterUserResponse,
  RegisterUserAndSetAddressResponse,
  UserCardRequest,
  UserCardRequestData,
  UserCardResponse,
  UserCardListResponse,
} from '../models/userAuth';
import { ApiResponse } from '../BaseHttpClient';
import { BaseUserAddressCreditCard } from '@support/interfaces/address_user';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { MerchantUserV3RoleResponse } from '@support/interfaces/adminRolesAndPermissions';
import { describeApiError } from '../utils/describeApiError';

@RegisterService(SERVICE_KEYS.USER_AUTH)
export class UserAuthService extends BaseService {
  /**
   * Performs guest login and returns authentication token
   * @param merchantId - The merchant ID
   * @param apiKey - The merchant's private key, sent as the X-Api-Key header
   * @param userId - Optional user ID, generates random UUID if not provided
   * @returns Promise with authentication tokens
   */
  async loginAsGuest(
    merchantId: string,
    apiKey: string,
    userId?: string
  ): Promise<ApiResponse<GuestLoginResponse>> {
    const requestData: GuestLoginRequest = {
      merchant_id: merchantId,
      user_id: userId || randomUUID(),
    };

    const response = await this.httpClient.request<GuestLoginResponse>({
      method: 'POST',
      url: EndpointConfig.getEndpoint('userAuth', 'guestLogin'),
      data: requestData,
      params: { type: 'guest' },
      auth: { type: 'api-key', apiKey },
    });

    return response;
  }

  async createMerchantUser(
    merchantToken: string,
    body: {
      email: string;
      name: string;
      password: string;
      role: string;
      store_code: string;
      merchants_ids: string[];
      network_id?: string;
      phone: string;
    }
  ): Promise<string> {
    try {
      const response = await this.httpClient.request<{ data: { email: string } }>({
        url: EndpointConfig.getEndpoint('userAuth', 'createMerchantUser'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: merchantToken },
      });
      return response.data.data.email;
    } catch (error) {
      throw new Error(`createMerchantUser failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Requests an email OTP code for a registered user.
   * @param email - The user's email address
   * @param apiKey - The merchant's private key, sent as the X-Api-Key header.
   *                 The gateway rejects this call with 401 `invalid X-API-KEY`
   *                 when it is missing.
   */
  async requestOtpCode(email: string, apiKey: string): Promise<void> {
    await this.httpClient.request({
      url: EndpointConfig.getEndpoint('userAuth', 'requestOtpCode'),
      method: 'POST',
      params: { type: 'email-passwordless' },
      data: { email },
      auth: { type: 'api-key', apiKey },
    });
  }

  async loginUserTypeSms(
    userEmail: string,
    otp: string = '010101',
    merchantId: string,
    privateKey: string
  ) {
    try {
      const response = await this.httpClient.request<LoginUserTypeSmsResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'loginUserTypeSms'),
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Api-Key': privateKey,
        },
        data: {
          email: userEmail,
          otp: otp,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Login user type sms failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async createNetwork(createNetworkRequest: CreateNetworkRequest): Promise<CreateNetworkResponse> {
    try {
      const response = await this.httpClient.request<CreateNetworkResponse>({
        method: 'POST',
        auth: {
          type: 'bearer',
          token: createNetworkRequest.merchantToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'createNetwork'),
        data: createNetworkRequest.data,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Create network failed: ${describeApiError(error)}`);
    }
  }

  async getNetwork(networkId: string, merchantToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.httpClient.request<void>({
        method: 'GET',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'getNetwork'),
        pathParams: {
          networkId: networkId,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Get network failed: ${describeApiError(error)}`);
    }
  }

  async deleteNetwork(networkId: string, merchantToken: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.httpClient.request<void>({
        method: 'DELETE',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'deleteNetwork'),
        pathParams: {
          networkId: networkId,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Delete network failed: ${describeApiError(error)}`);
    }
  }

  async addMerchantToNetwork(
    merchantToNetworkRequest: MerchantToNetworkRequest
  ): Promise<MerchantToNetworkResponse> {
    try {
      const response = await this.httpClient.request<MerchantToNetworkResponse>({
        method: 'POST',
        auth: {
          type: 'bearer',
          token: merchantToNetworkRequest.merchantToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'merchantToNetwork'),
        pathParams: {
          networkId: merchantToNetworkRequest.network_id,
          merchantId: merchantToNetworkRequest.merchant_id,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Add network to user failed: ${describeApiError(error)}`);
    }
  }

  async deleteMerchantFromNetwork(
    networkId: string,
    merchantId: string,
    merchantToken: string
  ): Promise<MerchantToNetworkResponse> {
    try {
      const response = await this.httpClient.request<MerchantToNetworkResponse>({
        method: 'DELETE',
        auth: {
          type: 'bearer',
          token: merchantToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'merchantToNetwork'),
        pathParams: {
          networkId: networkId,
          merchantId: merchantId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Delete network from user failed: ${describeApiError(error)}`);
    }
  }

  async createNetworkAndAddMerchantToNetwork(
    merchantId: string,
    merchantToken: string,
    createNetworkRequest?: CreateNetworkRequest
  ): Promise<MerchantToNetworkResponse> {
    try {
      // Create network
      const createNetworkResponse = await this.createNetwork(
        createNetworkRequest ?? {
          data: { name: `network_${crypto.randomUUID()}`, is_private: true },
          merchantToken,
        }
      );
      const networkId = createNetworkResponse.id;
      // Add merchant to network
      const addMerchantToNetworkRequest: MerchantToNetworkRequest = {
        merchant_id: merchantId,
        network_id: networkId,
        merchantToken,
      };
      const addMerchantToNetworkResponse = await this.addMerchantToNetwork(
        addMerchantToNetworkRequest
      );
      return addMerchantToNetworkResponse;
    } catch (error) {
      throw new Error(
        `Create network and add merchant to network failed: ${describeApiError(error)}`
      );
    }
  }

  async registerUser(
    registerUserRequest: RegisterUserRequest,
    expectError = false
  ): Promise<ApiResponse<RegisterUserResponse>> {
    try {
      const response = await this.httpClient.request<RegisterUserResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'registerUser'),
        data: registerUserRequest.data,
        auth: {
          type: 'api-key',
          apiKey: registerUserRequest.merchantPrivateKey,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': registerUserRequest.merchantId,
        },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Register user failed: ${describeApiError(error)}`);
    }
  }

  async getUser(merchantPrivateKey: string, userToken: string): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        method: 'GET',
        auth: {
          type: 'bearer',
          token: userToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'getUser'),
        headers: {
          'x-api-key': merchantPrivateKey,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Get user failed: ${describeApiError(error)}`);
    }
  }

  async deleteUser(
    userId: string,
    userToken: string,
    _expectError: boolean = false
  ): Promise<number | void> {
    try {
      const response = await this.httpClient.request<void>({
        method: 'DELETE',
        auth: {
          type: 'bearer',
          token: userToken,
        },
        url: EndpointConfig.getEndpoint('userAuth', 'deleteUser'),
        pathParams: {
          userId: userId,
        },
        expectError: _expectError,
      });

      if (_expectError) {
        return response.status;
      }

      return response.data;
    } catch (error) {
      throw new Error(`Delete user failed: ${describeApiError(error)}`);
    }
  }

  async setAddress(addressRequest: AddressUserRequest): Promise<AddressUserResponse> {
    try {
      const response = await this.httpClient.request<AddressUserResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'setAddress'),
        data: addressRequest.data,
        auth: {
          type: 'bearer',
          token: addressRequest.userToken,
        },
        pathParams: {
          userId: addressRequest.user_id,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': addressRequest.merchantId,
        },
        logging: {
          logRequest: false,
          logResponse: false,
          logData: false,
          logHeaders: false,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Set address failed: ${describeApiError(error)}`);
    }
  }

  async registerUserAndSetAddress(
    userData: Partial<RegisterUserRequestData>,
    options: {
      merchantPrivateKey: string;
      merchantId: string;
      addressData?: Partial<AddressUserRequestData>;
    }
  ): Promise<RegisterUserAndSetAddressResponse> {
    try {
      const registerUserRequest: RegisterUserRequest = {
        merchantPrivateKey: options.merchantPrivateKey,
        merchantId: options.merchantId,
        data: {
          ...DEFAULT_USER_DATA,
          ...userData,
        },
      };
      const registerUserResponse = await this.registerUser(registerUserRequest);

      const addressRequest: AddressUserRequest = {
        user_id: registerUserResponse.data.user_id,
        userToken: registerUserResponse.data.token,
        merchantId: registerUserRequest.merchantId,
        data: {
          ...DEFAULT_ADDRESS_DATA,
          ...options.addressData,
        },
      };

      const addressResponse = await this.setAddress(addressRequest);

      return {
        user: registerUserResponse.data,
        address: addressResponse,
      };
    } catch (error) {
      throw new Error(`Register user and set address failed: ${describeApiError(error)}`);
    }
  }

  async setCard(
    userCardRequest: UserCardRequest,
    expectError: boolean = false
  ): Promise<ApiResponse<UserCardResponse>> {
    try {
      const response = await this.httpClient.request<UserCardResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'setCard'),
        data: userCardRequest.data,
        auth: {
          type: 'bearer',
          token: userCardRequest.userToken,
        },
        pathParams: {
          userId: userCardRequest.userId,
        },
        expectError: expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Set card failed: ${JSON.stringify(error)}`);
    }
  }

  async getCard(
    userId: string,
    cardId: string,
    userToken: string,
    merchantPrivateKey: string,
    expectError = false
  ): Promise<ApiResponse<UserCardResponse>> {
    try {
      const response = await this.httpClient.request<UserCardResponse>({
        method: 'GET',
        url: EndpointConfig.getEndpoint('userAuth', 'getCard'),
        auth: { type: 'bearer', token: userToken },
        headers: { 'X-Api-Key': merchantPrivateKey },
        pathParams: { userId, cardId },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`getCard failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Lists every saved card for the user — GET /users/{userId}/cards. This is the endpoint
   * that failed with SQLSTATE 22007 in RIS-132 when a card had a corrupted expiration_date
   * (e.g. "/"). Unlike getCard, there is no cardId: a single bad row here fails the whole list.
   */
  async getCards(
    userId: string,
    userToken: string,
    merchantPrivateKey: string,
    expectError = false
  ): Promise<ApiResponse<UserCardListResponse>> {
    try {
      const response = await this.httpClient.request<UserCardListResponse>({
        method: 'GET',
        url: EndpointConfig.getEndpoint('userAuth', 'getCards'),
        auth: { type: 'bearer', token: userToken },
        headers: { 'X-Api-Key': merchantPrivateKey },
        pathParams: { userId },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`getCards failed: ${JSON.stringify(error)}`);
    }
  }

  async deleteCard(
    userId: string,
    cardId: string,
    userToken: string,
    merchantPrivateKey: string,
    expectError = false
  ): Promise<ApiResponse<void>> {
    try {
      const response = await this.httpClient.request<void>({
        method: 'DELETE',
        url: EndpointConfig.getEndpoint('userAuth', 'deleteCard'),
        auth: { type: 'bearer', token: userToken },
        headers: { 'x-api-key': merchantPrivateKey },
        pathParams: { userId, cardId },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`deleteCard failed: ${JSON.stringify(error)}`);
    }
  }

  async setCardToUser(
    userEmail: string,
    creditCardData: UserCardRequestData,
    merchantId: string,
    privateKey: string,
    otp?: string
  ) {
    try {
      const userTokenAuth = await this.loginUserTypeSms(userEmail, otp, merchantId, privateKey);
      const userInfo = await this.getUser(privateKey, userTokenAuth.token);
      const userId = userInfo.data.id;
      await this.setCard({
        userId: userId,
        userToken: userTokenAuth.token,
        data: creditCardData,
      });
      return userTokenAuth;
    } catch (error) {
      throw new Error(`Set card to user failed: ${describeApiError(error)}`);
    }
  }

  /**
   * Logs in via device fingerprint (X-Device-Id / X-Session-ID headers).
   * @returns session_token to be used in subsequent calls (e.g. logout)
   */
  async loginWithDeviceFingerprint(deviceId: string, sessionId: string): Promise<string> {
    try {
      const response = await this.httpClient.request<LoginDeviceFingerprintResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'loginDeviceFingerprint'),
        params: { load_profile_data: 'true' },
        headers: {
          'X-Device-Id': deviceId,
          'X-Session-ID': sessionId,
          Accept: 'application/json',
        },
      });
      return response.data.token;
    } catch (error) {
      throw new Error(`loginWithDeviceFingerprint failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  /**
   * Logs out the session identified by sessionToken.
   * Mirrors the second request in the CLOSE_SESSION Postman collection.
   */
  async logout(sessionToken: string, sessionId: string): Promise<void> {
    try {
      await this.httpClient.request<void>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'logout'),
        auth: { type: 'bearer', token: sessionToken },
        headers: {
          'x-session-id': sessionId,
        },
      });
    } catch (error) {
      throw new Error(`logout failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async encryptMessage(email: string, publicKey: string): Promise<string> {
    try {
      const response = await this.httpClient.request<{ 'auth-message': string }>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'signMessage'),
        data: {
          email: email,
          public_key: publicKey,
        },
        logging: {
          logRequest: false,
          logResponse: false,
          logData: false,
          logHeaders: false,
        },
      });

      return response.data['auth-message'];
    } catch (error) {
      throw new Error(`Encrypt message failed: ${describeApiError(error)}`);
    }
  }

  async externalAuthorize(
    privateKey: string,
    authMessage: string,
    expectError: boolean = false
  ): Promise<ApiResponse> {
    try {
      const response = await this.httpClient.request<ApiResponse>({
        method: 'POST',
        url: EndpointConfig.getEndpoint('userAuth', 'externalAuthorize'),
        headers: {
          'X-Api-Key': privateKey,
          'X-Auth-Message': authMessage,
        },
        expectError: expectError,
        logging: {
          logRequest: false,
          logResponse: false,
          logData: false,
          logHeaders: false,
        },
      });
      return response;
    } catch (error) {
      throw new Error(`External authorize failed: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async generateUser(
    publicKey: string,
    body: GenerateUserBody
  ): Promise<ApiResponse<GenerateUserResponse>> {
    try {
      const response = await this.httpClient.request<GenerateUserResponse>({
        url: EndpointConfig.getEndpoint('userAuth', 'generateUser'),
        method: 'POST',
        headers: { 'X-Api-Key': publicKey },
        data: body,
      });
      return response;
    } catch (error) {
      throw new Error(`generateUser failed: ${JSON.stringify(error)}`);
    }
  }

  async identifyUserDevice(
    sessionId: string,
    publicKey: string,
    merchantId: string,
    expectError = false
  ): Promise<ApiResponse<unknown>> {
    try {
      const response = await this.httpClient.request<unknown>({
        url: EndpointConfig.getEndpoint('userAuth', 'identifyDevice'),
        method: 'GET',
        pathParams: { session_id: sessionId },
        auth: { type: 'api-key', apiKey: publicKey },
        headers: { 'x-merchant-id': merchantId },
        expectError,
      });
      return response;
    } catch (error) {
      throw new Error(`Identify user device failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Creates a merchant user with network-level permissions across multiple merchants.
   * Migrated from ADM-T540 collection folder: user_with_network
   */
  async createMerchantUserWithNetwork(
    merchantToken: string,
    body: CreateMerchantUserWithNetworkBody
  ): Promise<string> {
    try {
      const response = await this.httpClient.request<{ data: { email: string } }>({
        url: EndpointConfig.getEndpoint('userAuth', 'createMerchantUser'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: merchantToken },
      });
      return response.data.data.email;
    } catch (error) {
      throw new Error(`createMerchantUserWithNetwork failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Creates a merchant user scoped to a single merchant (no network).
   * Migrated from ADM-T540 collection folder: user_without_network
   */
  async createMerchantUserWithoutNetwork(
    merchantToken: string,
    body: CreateMerchantUserWithoutNetworkBody
  ): Promise<string> {
    try {
      const response = await this.httpClient.request<{ data: { email: string } }>({
        url: EndpointConfig.getEndpoint('userAuth', 'createMerchantUser'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: merchantToken },
      });
      return response.data.data.email;
    } catch (error) {
      throw new Error(`createMerchantUserWithoutNetwork failed: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Creates a merchant role with full permissions for the given merchants.
   * Migrated from ADM-T540 collection folder: create_role
   */
  async createMerchantRole(
    merchantToken: string,
    merchantId: string,
    body: CreateMerchantRoleBody
  ): Promise<MerchantUserV3RoleResponse> {
    try {
      const response = await this.httpClient.request<CreateMerchantRoleApiResponse>({
        url: EndpointConfig.getEndpoint('userAuth', 'createMerchantRole'),
        method: 'POST',
        data: body,
        auth: { type: 'bearer', token: merchantToken },
        headers: { 'x-merchant-id': merchantId },
      });
      return {
        isOk: true,
        Name: response.data.name,
        roleID: response.data.parent_id,
        roleEnvironments: JSON.stringify(response.data.environments),
        roleResources: JSON.stringify(response.data.merchants),
      };
    } catch (error) {
      throw new Error(`createMerchantRole failed: ${JSON.stringify(error)}`);
    }
  }
}
