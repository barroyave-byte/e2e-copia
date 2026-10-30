import { Page, test } from '@support/fixtures';

/**
 * Values a step produced, keyed by the `saveAs` name given at the call site.
 *
 * This is the DSL's data bus. Before it existed, the only way for one action to hand a value
 * to a later one was `process.env` (ORDER_TOKEN_NEW, MERCHANT_ID_NEW, ...) read through
 * `saveConfig` / `tokenizeOrder` default parameters, which made the dependency invisible:
 * `admin.orders.goToOrder` takes no params but silently needs an order created several steps
 * earlier. Reordering or deleting a step gave no signal at all, and the globals leaked
 * between specs sharing a worker.
 */
export class TestState {
  private values = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  /** Reads a saved value, throwing with the available keys when it is missing. */
  get<T = unknown>(key: string): T {
    if (!this.values.has(key)) {
      const available = this.keys();
      throw new Error(
        `No value saved as "${key}". ` +
          (available.length > 0
            ? `Available: ${available.join(', ')}. Add \`saveAs: '${key}'\` to the step that produces it.`
            : `No step has saved a value yet — add \`saveAs: '${key}'\` to the step that produces it.`)
      );
    }
    return this.values.get(key) as T;
  }

  keys(): string[] {
    return [...this.values.keys()];
  }

  clear(): void {
    this.values.clear();
  }
}

export interface Context {
  page: Page;
  test: typeof test;
  merchant?: {
    merchantId: string;
    merchantName: string;
    merchantToken: string;
    privateKey: string;
    publicKey: string;
  };
  /**
   * Values saved by earlier steps via `saveAs`. Optional at the call site so existing specs
   * keep constructing `new TestingFramework({ page, test })`; the framework always populates
   * it before any action runs.
   */
  state?: TestState;
}

export abstract class FrameworkPlugin {
  pluginBaseName!: string;

  context!: Context;

  setTestContext(context: Context) {
    this.context = context;
  }

  /**
   * The step store. Non-optional for plugin authors — the framework guarantees it is set.
   */
  protected get state(): TestState {
    if (!this.context.state) {
      throw new Error(
        `${this.pluginBaseName}: test state is not initialised. Actions must run through TestingFramework.run().`
      );
    }
    return this.context.state;
  }
}
