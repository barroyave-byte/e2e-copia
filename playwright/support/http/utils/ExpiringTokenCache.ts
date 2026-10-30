/** Refresh this long before the JWT `exp`, so a token never expires mid-request. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** Lifetime assumed for a token whose expiry cannot be read. */
const FALLBACK_TTL_MS = 10 * 60 * 1000;

/** Reads the `exp` claim of a JWT as epoch milliseconds, or undefined when it has none. */
export function readJwtExpiry(token: string): number | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8'
    );
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Holds one token per process and hands it to every caller until it is about to expire.
 * Concurrent callers share the same in-flight fetch; a failed fetch is not cached, so the
 * next caller tries again.
 */
export class ExpiringTokenCache {
  private token?: string;
  private expiresAt = 0;
  private inFlight?: Promise<string>;

  constructor(private readonly now: () => number = Date.now) {}

  async get(fetchToken: () => Promise<string>): Promise<string> {
    if (this.token && this.now() < this.expiresAt - EXPIRY_MARGIN_MS) {
      return this.token;
    }
    if (!this.inFlight) {
      this.inFlight = fetchToken()
        .then((token) => {
          this.token = token;
          this.expiresAt = readJwtExpiry(token) ?? this.now() + FALLBACK_TTL_MS + EXPIRY_MARGIN_MS;
          return token;
        })
        .finally(() => {
          this.inFlight = undefined;
        });
    }
    return this.inFlight;
  }

  invalidate(): void {
    this.token = undefined;
    this.expiresAt = 0;
  }
}
