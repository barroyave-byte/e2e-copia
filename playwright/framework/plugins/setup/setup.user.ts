import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import {
  STATE_KEYS,
  publish,
  resolveMerchantId,
  resolveMerchantToken,
  resolvePrivateKey,
  resolveUserId,
  resolveUserToken,
} from '../../resolve';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import {
  AddressUserRequestData,
  RegisterUserRequestData,
  UserCardListResponse,
  UserCardRequestData,
  UserCardResponse,
} from '@support/http/models/userAuth';
import { ApiResponse } from '@support/http/BaseHttpClient';
import { setCreditCardForUserInNetwork } from '@support/newman/apiCallNewman';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { BaseUserAddressCreditCard } from '@support/interfaces/address_user';
import { BaseUserData } from '@support/interfaces/user_data';

/**
 * Provisioning of the shopper: registration, saved card and login.
 *
 * This is the largest gap the DSL had. Across the suite, `registerUserAndSetAddress` (117
 * uses), `setCreditCardForUser` (78) and `setUserToken` (52) are the setup calls that specs
 * still had to make in a hand-written `beforeAll`, which is why every authenticated or
 * saved-card flow — vault, elements, checkout enterprise — could not be expressed as steps.
 */
export class PluginSetupUser extends FrameworkPlugin {
  pluginBaseName = 'setup.user';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  private get userAuthService() {
    return ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  }

  /** A fresh address that no other run has used, so registrations never collide. */
  private uniqueEmail(): string {
    return `${Date.now()}.${Math.floor(Math.random() * 9999)}.qa@deuna.com`;
  }

  /** @description Registers a shopper and sets their address, so later steps can run an authenticated or saved-card flow. Generates a unique email when none is given, and publishes it to the step store for setup.user.saveCreditCard and setup.user.login to reuse. merchantId and privateKey default to the merchant from a previous setup.merchant action. Returns the register response — add saveAs to reference it from a later step. */
  async $tf_register({
    email,
    userData,
    addressData,
    merchantId,
    privateKey,
  }: {
    email?: string;
    userData?: Partial<RegisterUserRequestData>;
    addressData?: Partial<AddressUserRequestData>;
    merchantId?: string;
    privateKey?: string;
  } = {}) {
    const action = 'setup.user.register';
    const resolvedEmail = email ?? this.uniqueEmail();

    const response = await this.userAuthService.registerUserAndSetAddress(
      { ...userData, email: resolvedEmail },
      {
        merchantId: resolveMerchantId(this.context, action, merchantId),
        merchantPrivateKey: resolvePrivateKey(this.context, action, privateKey),
        ...(addressData ? { addressData } : {}),
      }
    );

    publish(this.context, STATE_KEYS.userEmail, resolvedEmail);
    publish(this.context, STATE_KEYS.userId, response?.user?.user_id);
    return response;
  }

  /**
   * @description Enrolls a card on an existing registered shopper via POST
   * `/users/{userId}/cards`. Two input modes:
   *   - Fixture mode (happy path): pass `creditCard` + `address`. The action derives the
   *     `UserCardRequestData` from them (expiry month/year split from `expiration_date`,
   *     address fields mapped straight through) so saved-card flows avoid repeating the
   *     payload shape at every call site.
   *   - Raw mode (negative tests): pass `cardData` with the exact payload to send. Use
   *     this to drive validation tests that need deliberately malformed data (e.g.
   *     `expiry_month: '/'`) — pair with `expectError: true` and a follow-up
   *     `assertCardCreationRejected` to confirm the create-time guard rejects it before it
   *     touches the database.
   * Exactly one of the modes must be supplied; passing both or neither throws before any
   * request leaves the client. Returns the full ApiResponse — `data.data.id` is the saved
   * `card_id`. `userId` and `userToken` default to the shopper published by
   * `setup.user.register`; pass them explicitly in multi-shopper flows, since the defaults
   * follow only the last-registered shopper.
   */
  async $tf_enrollCard({
    creditCard,
    address,
    cardData,
    userId,
    userToken,
    expectError,
  }: {
    creditCard?: BaseCreditCard;
    address?: BaseUserAddressCreditCard;
    cardData?: UserCardRequestData;
    userId?: string;
    userToken?: string;
    expectError?: boolean;
  }): Promise<ApiResponse<UserCardResponse>> {
    const action = 'setup.user.enrollCard';

    const fixtureMode = creditCard !== undefined || address !== undefined;
    const rawMode = cardData !== undefined;

    if (fixtureMode && rawMode) {
      throw new Error(`${action}: pass either (creditCard + address) OR cardData — not both.`);
    }
    if (!fixtureMode && !rawMode) {
      throw new Error(
        `${action}: pass (creditCard + address) for a fixture-based enrollment, or cardData for a raw payload.`
      );
    }
    if (fixtureMode && (!creditCard || !address)) {
      throw new Error(`${action}: fixture mode requires both creditCard and address.`);
    }

    const data: UserCardRequestData = cardData ?? {
      address1: address!.address1,
      card_cvv: creditCard!.cvv_code,
      card_holder: creditCard!.cardholder_name,
      card_holder_dni: creditCard!.document_number,
      card_number: creditCard!.number,
      city: address!.city,
      country: address!.country,
      expiry_month: creditCard!.expiration_date.substring(0, 2),
      expiry_year: `20${creditCard!.expiration_date.substring(2, 4)}`,
      phone: address!.phone,
      state: address!.state,
      zip: address!.zip,
    };

    return await this.userAuthService.setCard(
      {
        userId: resolveUserId(this.context, action, userId),
        userToken: resolveUserToken(this.context, action, userToken),
        data,
      },
      expectError ?? false
    );
  }

  /** @description Saves a credit card to a registered shopper so the widget opens on the saved-cards view. email defaults to the shopper created by a previous setup.user.register action; privateKey defaults to the merchant from setup.merchant. */
  async $tf_saveCreditCard({
    creditCard,
    address,
    userData,
    email,
    privateKey,
  }: {
    creditCard: BaseCreditCard;
    address: BaseUserAddressCreditCard;
    userData: BaseUserData;
    email?: string;
    privateKey?: string;
  }) {
    const action = 'setup.user.saveCreditCard';

    return await setCreditCardForUserInNetwork(
      this.resolveEmail(action, email),
      creditCard,
      address,
      userData,
      resolvePrivateKey(this.context, action, privateKey)
    );
  }

  /** @description Logs the shopper in via the SMS OTP channel and publishes the resulting user token to the step store, so a following checkout.openCheckout starts already authenticated instead of as a guest. email defaults to the shopper from setup.user.register; otp defaults to 010101. Returns the login response. */
  async $tf_login({
    email,
    otp,
    merchantId,
    privateKey,
  }: {
    email?: string;
    otp?: string;
    merchantId?: string;
    privateKey?: string;
  } = {}) {
    const action = 'setup.user.login';

    const response = await this.userAuthService.loginUserTypeSms(
      this.resolveEmail(action, email),
      otp ?? '010101',
      resolveMerchantId(this.context, action, merchantId),
      resolvePrivateKey(this.context, action, privateKey)
    );

    publish(this.context, STATE_KEYS.userToken, response?.token);
    return response;
  }

  /**
   * @description Lists every saved card for the shopper via GET /users/{userId}/cards — the
   * exact endpoint that returned HTTP 500 (SQLSTATE 22007) in RIS-132 when a card had a
   * corrupted expiration_date. userId defaults to the shopper from setup.user.register;
   * userToken defaults to the token from setup.user.login; privateKey defaults to the merchant
   * from setup.merchant. Returns the raw ApiResponse for setup.user.assertCardsListHealthy.
   */
  async $tf_getCards({
    userId,
    userToken,
    privateKey,
    expectError,
  }: {
    userId?: string;
    userToken?: string;
    privateKey?: string;
    expectError?: boolean;
  } = {}): Promise<ApiResponse<UserCardListResponse>> {
    const action = 'setup.user.getCards';

    return await this.userAuthService.getCards(
      resolveUserId(this.context, action, userId),
      resolveUserToken(this.context, action, userToken),
      resolvePrivateKey(this.context, action, privateKey),
      expectError ?? false
    );
  }

  /** @description Returns the id of the shopper's saved card matching the last four digits of the given card number. Needed by actions that address a card by id, such as the subscriptions guard. */
  async $tf_getCardId({
    cardNumber,
    userId,
    userToken,
    privateKey,
  }: {
    cardNumber: string;
    userId?: string;
    userToken?: string;
    privateKey?: string;
  }): Promise<string> {
    const lastFour = cardNumber.slice(-4);
    const { data } = await this.$tf_getCards({ userId, userToken, privateKey });

    const card = data.data.find((saved) => saved.last_four === lastFour);

    if (!card?.id) {
      throw new Error(
        `setup.user.getCardId: no saved card ending in ${lastFour}. Saved cards: ${data.data
          .map((saved) => saved.last_four)
          .join(', ')}`
      );
    }

    return card.id;
  }

  /**
   * @description Asserts that a `setup.user.enrollCard` call in raw mode (with `cardData`
   * and `expectError: true`) was rejected the way RIS-132's fix requires: HTTP 400, the
   * `error.credit_card_validation` code, a description mentioning the invalid expiration,
   * and no persisted card (no `data.id`) — proving the invalid `expiry_month` never
   * reaches the database in the first place.
   */
  async $tf_assertCardCreationRejected({
    response,
    descriptionContains,
  }: {
    response: ApiResponse<
      UserCardResponse & {
        code?: string;
        description?: string;
        message?: string;
        error?: { code?: string; description?: string; message?: string };
      }
    >;
    descriptionContains?: string;
  }) {
    const body = response.data as Record<string, any> | undefined;
    const errorCode = body?.code ?? body?.error?.code;
    const errorDescription =
      body?.description ?? body?.message ?? body?.error?.description ?? body?.error?.message ?? '';

    expect(response.status, 'card creation must be rejected with 400').toBe(400);
    expect(errorCode, 'error code must identify a card validation failure').toBe(
      'error.credit_card_validation'
    );
    if (descriptionContains) {
      expect(errorDescription, 'error description must explain the invalid expiration').toContain(
        descriptionContains
      );
    } else {
      expect(errorDescription, 'error response must include a non-empty description').not.toBe('');
    }
    expect(body?.data?.id, 'rejected card must not be persisted').toBeFalsy();
  }

  /**
   * @description Asserts that a setup.user.getCards response proves RIS-132 is fixed: HTTP 200
   * (not the 500/SQLSTATE 22007 from the incident), a readable card list, and none of the
   * rejected card numbers from setup.user.enrollCard present in it.
   */
  async $tf_assertCardsListHealthy({
    response,
    rejectedCardNumbers,
  }: {
    response: ApiResponse<UserCardListResponse>;
    rejectedCardNumbers?: string[];
  }) {
    expect(response.status, 'get_cards must not fail with 500 (SQLSTATE 22007)').toBe(200);
    expect(Array.isArray(response.data?.data), 'get_cards must return a readable card list').toBe(
      true
    );

    for (const cardNumber of rejectedCardNumbers ?? []) {
      const lastFour = cardNumber.slice(-4);
      expect(
        response.data.data.some((card) => card.last_four === lastFour),
        `rejected card ending in ${lastFour} must not appear in the saved cards list`
      ).toBe(false);
    }
  }

  private resolveEmail(action: string, explicit?: string): string {
    const resolved = explicit ?? this.context.state?.get<string>(STATE_KEYS.userEmail);
    if (!resolved) {
      throw new Error(
        `${action}: "email" is not available. Pass it in params, or run setup.user.register earlier in the same run.`
      );
    }
    return resolved;
  }
}
