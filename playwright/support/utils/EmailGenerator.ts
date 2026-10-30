import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';

/**
 * Centralizes random email generation for tests.
 * Staging accumulates years of test runs, so a 7-digit Math.random() prefix
 * collides often (error.entity_already_exists on /users/register). UUIDs avoid that.
 */
export class EmailGenerator {
  private static readonly QA_DOMAIN = 'qa@deuna.com';

  /**
   * Email for flows that register the user (e.g. registerUserAndSetAddress), and for any
   * other `.qa@deuna.com` email a test needs to be unique.
   * Must end in `.qa@deuna.com` so it's recognized as a disposable QA account.
   * 16 hex characters (64 random bits) keep it at 29 characters, close to the old
   * 7-digit emails, so no processor email-length limit is crossed.
   */
  static generateRegisteredUserEmail(): string {
    return `${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}.${EmailGenerator.QA_DOMAIN}`;
  }

  /**
   * Realistic payer/billing email, unique per call and no longer than a plain
   * `faker.internet.email()` (45 chars).
   * - A bare `faker.internet.email()` (e.g. `Kavon7@yahoo.com`) repeats addresses staging
   *   already holds as registered users, so the widget asked for an OTP instead of showing
   *   the guest card form.
   * - A full UUID as the faker first name produced up to 62 chars, and PagBank rejects
   *   anything over 60 (processor_error 40002 "size must be between 5 and 60" → DP-3002).
   */
  static generatePayerEmail(): string {
    return faker.internet.email({ firstName: crypto.randomUUID().replace(/-/g, '').slice(0, 8) });
  }
}
