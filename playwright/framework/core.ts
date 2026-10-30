import { PluginAdminAuth } from './plugins/admin/admin.auth';
import { PluginAdminAvs } from './plugins/admin/admin.avs';
import { PluginAdminBatchProcessing } from './plugins/admin/admin.batchProcessing';
import { PluginAdminConnections } from './plugins/admin/admin.connections';
import { PluginAdminConsolidatedFlows } from './plugins/admin/admin.consolidatedFlows';
import { PluginAdminErrorManagement } from './plugins/admin/admin.errorManagement';
import { PluginAdminFraud } from './plugins/admin/admin.fraud';
import { PluginAdminInstallments } from './plugins/admin/admin.installments';
import { PluginAdminLogs } from './plugins/admin/admin.logs';
import { PluginAdminMetrics } from './plugins/admin/admin.metrics';
import { PluginAdminMocks } from './plugins/admin/admin.mocks';
import { PluginAdminNavigate } from './plugins/admin/admin.navigate';
import { PluginAdminOrders } from './plugins/admin/admin.orders';
import { PluginAdminPaymentLinks } from './plugins/admin/admin.paymentLinks';
import { PluginAdminReports } from './plugins/admin/admin.reports';
import { PluginAdminRoles } from './plugins/admin/admin.roles';
import { PluginAdminRouting } from './plugins/admin/admin.routing';
import { PluginAdminSubscriptions } from './plugins/admin/admin.subscriptions';
import { PluginAnalyticsEvents } from './plugins/analytics/analytics.events';
// import { PluginApiGuard } from './plugins/api/api.guard';
import { PluginApiBazSync } from './plugins/api/api.bazSync';
import { PluginApiOrders } from './plugins/api/api.orders';
import { PluginApiPayment } from './plugins/api/api.payment';
import { PluginApiProcessors } from './plugins/api/api.processors';
import { PluginCheckout } from './plugins/checkout/checkout';
import { PluginCheckout3DS } from './plugins/checkout/checkout.3ds';
import { PluginCheckoutApmFintoc } from './plugins/checkout/checkout.apm.fintoc';
import { PluginCheckoutApmNupay } from './plugins/checkout/checkout.apm.nupay';
import { PluginCheckoutApmOxxo } from './plugins/checkout/checkout.apm.oxxo';
import { PluginCheckoutApmPse } from './plugins/checkout/checkout.apm.pse';
import { PluginCheckoutBnplAddi } from './plugins/checkout/checkout.bnpl.addi';
import { PluginCheckoutBnplAplazo } from './plugins/checkout/checkout.bnpl.aplazo';
import { PluginCheckoutBnplKueski } from './plugins/checkout/checkout.bnpl.kueski';
import { PluginCheckoutBnplPaypalPayLater } from './plugins/checkout/checkout.bnpl.paypalPayLater';
import { PluginCheckoutEmail } from './plugins/checkout/checkout.email';
import { PluginCheckoutForms } from './plugins/checkout/checkout.forms';
import { PluginCheckoutNextAction } from './plugins/checkout/checkout.nextAction';
import { PluginCheckoutInstallments } from './plugins/checkout/checkout.installments';
import { PluginCheckoutPaymentLink } from './plugins/checkout/checkout.paymentLink';
import { PluginCheckoutPaymentWidget } from './plugins/checkout/checkout.paymentWidget';
import { PluginCheckoutPostTransaction } from './plugins/checkout/checkout.postTransaction';
import { PluginCheckoutUserData } from './plugins/checkout/checkout.userData';
import { PluginCheckoutVault } from './plugins/checkout/checkout.vault';
import { PluginCheckoutWebsdk } from './plugins/checkout/checkout.websdk';
import { PluginCheckoutVoucherPix } from './plugins/checkout/checkout.voucher.pix';
import { PluginCheckoutVoucherDeunaWallet } from './plugins/checkout/checkout.voucher.deunaWallet';
import { PluginCheckoutVoucherEfecty } from './plugins/checkout/checkout.voucher.efecty';
import { PluginCheckoutVoucherFemsaOxxo } from './plugins/checkout/checkout.voucher.femsaOxxo';
import { PluginCheckoutVoucherKlap } from './plugins/checkout/checkout.voucher.klap';
import { PluginCheckoutVoucherOxxo } from './plugins/checkout/checkout.voucher.oxxo';
import { PluginCheckoutVoucherSafetypay } from './plugins/checkout/checkout.voucher.safetypay';
import { PluginCheckoutWalletApplePay } from './plugins/checkout/checkout.wallet.applePay';
import { PluginCheckoutWalletBizum } from './plugins/checkout/checkout.wallet.bizum';
import { PluginCheckoutWalletClick2Pay } from './plugins/checkout/checkout.wallet.click2pay';
import { PluginCheckoutWalletDaviplata } from './plugins/checkout/checkout.wallet.daviplata';
import { PluginCheckoutWalletGooglePay } from './plugins/checkout/checkout.wallet.googlePay';
import { PluginCheckoutWalletMercadoPago } from './plugins/checkout/checkout.wallet.mercadoPago';
import { PluginCheckoutWalletNequi } from './plugins/checkout/checkout.wallet.nequi';
import { PluginCheckoutWalletPaypal } from './plugins/checkout/checkout.wallet.paypal';
import { PluginCheckoutWalletVenmo } from './plugins/checkout/checkout.wallet.venmo';
import { PluginCoreTiming } from './plugins/core/core.timing';
import { PluginPaymentPage } from './plugins/payment/payment.page';
import { PluginSetupMerchant } from './plugins/setup/setup.merchant';
import { PluginSetupOrder } from './plugins/setup/setup.order';
import { PluginSetupProcessor } from './plugins/setup/setup.processor';
import { PluginSetupUser } from './plugins/setup/setup.user';
import { PluginSetupCheckout } from './plugins/setup/setup.checkout';
import { PluginSetupFraud } from './plugins/setup/setup.fraud';
import { PluginSetupRouting } from './plugins/setup/setup.routing';
import { PluginSetupCampaign } from './plugins/setup/setup.campaign';
import { PluginVisualCheckout } from './plugins/visual/visual.checkout';
import { Context, FrameworkPlugin, TestState } from './plugins/interface';
import type { ActionStep } from './generated/actions';
import { StepRef, isStepRef, readPath, ref } from './ref';
import { redact } from './redact';

export type { ActionStep };
export { ref, StepRef };

/**
 * A step, plus the framework-level options every action accepts.
 *
 * `saveAs` is intersected onto the generated union rather than generated into it because it
 * is a property of the runner, not of any action's signature.
 */
export type Step = ActionStep & {
  /** Stores this action's return value under `name` for later steps to `ref()`. */
  saveAs?: string;
};

/**
 * Return type for the reusable step sequences that flow classes expose.
 *
 * Annotate every `flowSteps()` with it:
 *
 * ```ts
 * flowSteps(): FlowSteps {
 *   return [{ action: 'checkout.openCheckout', params: { experienceType: 'Payment Widget' } }];
 * }
 * ```
 *
 * Without the annotation a flow still typechecks — but only because each one remembers to
 * write `as const`, and the error then surfaces in whichever spec spreads the flow rather
 * than in the flow itself, pointing at the wrong file. The annotation supplies the
 * contextual type directly: `as const` becomes unnecessary and mistakes are reported where
 * they were written.
 */
export type FlowSteps = Step[];

interface Testing {
  environment?: {
    headless: boolean;
    locale: 'es-ES';
  };
  data?: {};
  /**
   * Steps are typed against the generated action union, so an unknown action name, a
   * misspelled parameter or a wrong parameter type fails `tsc --noEmit` instead of surfacing
   * at runtime after `beforeAll` has already provisioned merchants, processors and orders.
   *
   * Regenerate with `npm run generate-action-types` after adding or changing an action.
   */
  step: Step[];
  /**
   * Steps that always run once `step` finishes, whether it passed or threw — the place to
   * delete what the test created (processors, campaigns, rules).
   *
   * Every entry is attempted even if an earlier one fails, and a cleanup failure never
   * replaces the failure from `step`: a test that failed for a real reason must keep
   * reporting that reason, not a teardown error on top of it.
   */
  cleanup?: Step[];
}

type ActionFunction = (params?: {}) => Promise<unknown>;

type PluginConstructor = new () => FrameworkPlugin;

/** One executed step, as written to the failure attachment. Params are always redacted. */
interface StepTrace {
  index: number;
  action: string;
  stepName?: string;
  params?: Record<string, unknown>;
  saveAs?: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

export const defaultPlugins: PluginConstructor[] = [
  PluginAdminAuth,
  PluginAdminAvs,
  PluginAdminBatchProcessing,
  PluginAdminConnections,
  PluginAdminConsolidatedFlows,
  PluginAdminErrorManagement,
  PluginAdminFraud,
  PluginAdminInstallments,
  PluginAdminLogs,
  PluginAdminMetrics,
  PluginAdminMocks,
  PluginAdminNavigate,
  PluginAdminOrders,
  PluginAdminPaymentLinks,
  PluginAdminReports,
  PluginAdminRoles,
  PluginAdminRouting,
  PluginAdminSubscriptions,
  PluginAnalyticsEvents,

  // new PluginApiGuard(),
  PluginApiBazSync,
  PluginApiOrders,
  PluginApiPayment,
  PluginApiProcessors,

  PluginCheckout,
  PluginCheckout3DS,
  PluginCheckoutApmFintoc,
  PluginCheckoutApmNupay,
  PluginCheckoutApmOxxo,
  PluginCheckoutApmPse,
  PluginCheckoutBnplAddi,
  PluginCheckoutBnplAplazo,
  PluginCheckoutBnplKueski,
  PluginCheckoutBnplPaypalPayLater,
  PluginCheckoutEmail,
  PluginCheckoutForms,
  PluginCheckoutNextAction,
  PluginCheckoutInstallments,
  PluginCheckoutPaymentLink,
  PluginCheckoutPaymentWidget,
  PluginCheckoutPostTransaction,
  PluginCheckoutUserData,
  PluginCheckoutVault,
  PluginCheckoutWebsdk,
  PluginCheckoutVoucherPix,
  PluginCheckoutVoucherDeunaWallet,
  PluginCheckoutVoucherEfecty,
  PluginCheckoutVoucherFemsaOxxo,
  PluginCheckoutVoucherKlap,
  PluginCheckoutVoucherOxxo,
  PluginCheckoutVoucherSafetypay,
  PluginCheckoutWalletApplePay,
  PluginCheckoutWalletBizum,
  PluginCheckoutWalletClick2Pay,
  PluginCheckoutWalletDaviplata,
  PluginCheckoutWalletGooglePay,
  PluginCheckoutWalletMercadoPago,
  PluginCheckoutWalletNequi,
  PluginCheckoutWalletPaypal,
  PluginCheckoutWalletVenmo,

  PluginCoreTiming,

  PluginPaymentPage,

  PluginSetupFraud,
  PluginSetupMerchant,
  PluginSetupOrder,
  PluginSetupProcessor,
  PluginSetupRouting,
  PluginSetupUser,
  PluginSetupCheckout,
  PluginSetupCampaign,

  PluginVisualCheckout,
];

export class TestingFramework {
  actions: Map<string, ActionFunction> = new Map();
  plugins: FrameworkPlugin[] = [];

  context: Context;

  constructor(context: Context) {
    // Plugins are constructed per framework instance. They used to be module-level
    // singletons that every `new TestingFramework` re-pointed via `setTestContext`, so any
    // plugin holding state (analytics.events buffers the captured events) carried it from
    // one test to the next inside the same worker.
    this.context = { ...context, state: context.state ?? new TestState() };
    this.registerPlugins(defaultPlugins);
  }

  registerPlugin(PluginClass: PluginConstructor) {
    const plugin = new PluginClass();
    plugin.setTestContext(this.context);
    this.plugins.push(plugin);

    const actions = Object.getOwnPropertyNames(Object.getPrototypeOf(plugin));
    const members = plugin as unknown as Record<string, unknown>;

    for (const action of actions) {
      // startsWith, not includes: the prefix marks an action only at the head of the name,
      // and `replace('$tf_', '')` on a mid-name match would mangle the action name.
      if (!action.startsWith('$tf_')) {
        continue;
      }

      const actionName = `${plugin.pluginBaseName}.${action.slice(4)}`;

      if (this.actions.has(actionName)) {
        throw new Error(`Action ${actionName} is already registered by another plugin.`);
      }

      const method = members[action];
      if (typeof method !== 'function') continue;

      this.actions.set(actionName, (method as ActionFunction).bind(plugin));
    }
  }

  registerPlugins(plugins: PluginConstructor[]) {
    plugins.forEach((plugin) => this.registerPlugin(plugin));
  }

  private findSimilarActions(actionName: string): string[] {
    const inputParts = actionName.toLowerCase().split('.');

    return Array.from(this.actions.keys())
      .map((key) => {
        const keyParts = key.toLowerCase().split('.');
        const score = inputParts.filter((part) => keyParts.includes(part)).length;
        return { key, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ key }) => key);
  }

  private buildActionNotFoundHint(action: string): string {
    const suggestions = this.findSimilarActions(action);
    const hint =
      suggestions.length > 0
        ? `Did you mean: ${suggestions.join(', ')}`
        : `Available actions: ${Array.from(this.actions.keys()).join(', ')}`;
    return `"${action}" — ${hint}`;
  }

  async run(spec: Testing) {
    // Both lists are validated before anything executes, so a typo in a cleanup action is
    // reported up front rather than after the test body has already provisioned data.
    const declaredSteps = [...spec.step, ...(spec.cleanup ?? [])];
    const missing = declaredSteps.filter((step) => !this.actions.has(step.action));

    if (missing.length > 0) {
      const details = missing.map(({ action }) => this.buildActionNotFoundHint(action)).join('\n');
      throw new Error(`Actions not found:\n${details}`);
    }

    const state = this.context.state!;
    const trace: StepTrace[] = [];

    try {
      for (const [index, step] of spec.step.entries()) {
        await this.runStep(step, index, state, trace);
      }
    } finally {
      await this.runCleanup(spec.cleanup ?? [], state, trace);
    }
  }

  /** Executes one step: resolves its references, records it, and runs the action. */
  private async runStep(step: Step, index: number, state: TestState, trace: StepTrace[]) {
    // Actions that take no parameters have no `params` key in their union member.
    const declared = 'params' in step ? step.params : undefined;

    await this.context.test.step(step.stepName ?? step.action, async () => {
      const startedAt = Date.now();

      const entry: StepTrace = {
        index: index + 1,
        action: step.action,
        stepName: step.stepName,
        // Replaced with the resolved values once refs are read; kept as declared until
        // then so a failure during resolution still reports what the spec asked for.
        params: redact(declared) as Record<string, unknown> | undefined,
        saveAs: step.saveAs,
        status: 'failed',
        durationMs: 0,
      };
      trace.push(entry);

      // Resolution is inside the try: an unresolvable `ref` is a step failure like any
      // other and must produce the same attachment.
      try {
        const params = this.resolveRefs(declared, state);
        entry.params = redact(params) as Record<string, unknown> | undefined;

        const result = await this.actions.get(step.action)!(params as {});
        if (step.saveAs) state.set(step.saveAs, result);
        entry.status = 'passed';
        entry.durationMs = Date.now() - startedAt;
      } catch (error) {
        entry.durationMs = Date.now() - startedAt;
        entry.error = error instanceof Error ? error.message : String(error);
        await this.attachTrace(trace, entry, state);
        throw this.describeStepFailure(error, step, index, state);
      }
    });
  }

  /**
   * Runs the teardown steps best-effort.
   *
   * Deliberately swallows failures rather than rethrowing. Cleanup runs inside a `finally`,
   * so throwing here would replace the real failure from the test body with a teardown error
   * — the single most misleading thing a runner can do. Each failure is still reported as a
   * failed Playwright step and lands in the trace, so it stays visible without hijacking the
   * verdict. A cleanup step that must be enforced belongs in `step`, not here.
   */
  private async runCleanup(cleanup: Step[], state: TestState, trace: StepTrace[]) {
    for (const [index, step] of cleanup.entries()) {
      try {
        await this.runStep(step, index, state, trace);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[cleanup] ${step.action} failed and was ignored: ${reason}`);
      }
    }
  }

  /**
   * Writes the executed steps as a JSON attachment when one fails.
   *
   * Playwright's trace shows the step names but not which action produced them, nor the
   * params, nor what earlier steps had saved — so reconstructing a failure means reading the
   * spec and the page objects by hand. Attached only on failure: the happy path pays nothing,
   * and this is exactly the run where the detail is wanted.
   *
   * Everything goes through `redact` first — params carry card data and merchant credentials.
   */
  private async attachTrace(trace: StepTrace[], failed: StepTrace, state: TestState) {
    try {
      const payload = {
        failedAt: { index: failed.index, action: failed.action },
        savedValues: state.keys(),
        steps: trace,
      };

      await this.context.test.info().attach('dsl-failure.json', {
        body: JSON.stringify(payload, null, 2),
        contentType: 'application/json',
      });
    } catch {
      // Never let diagnostics mask the real failure — e.g. when run() is called outside a
      // Playwright test, where test.info() has no active context.
    }
  }

  /** Replaces every `ref(...)` placeholder with the value an earlier step saved. */
  private resolveRefs(value: unknown, state: TestState): unknown {
    if (isStepRef(value)) {
      const saved = state.get(value.key);
      return value.path ? readPath(saved, value.path, value.key) : saved;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveRefs(item, state));
    }

    // Only plain objects are traversed. Class instances (page objects, credit-card fixtures,
    // Buffers) are passed through untouched — rebuilding them would drop their prototype.
    if (value !== null && typeof value === 'object' && isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.resolveRefs(item, state)])
      );
    }

    return value;
  }

  /**
   * Wraps a step failure so the message names the action instead of surfacing a bare page
   * object error ("locator.click: Timeout 30000ms exceeded") with no indication of which DSL
   * step produced it.
   */
  private describeStepFailure(error: unknown, step: Step, index: number, state: TestState): Error {
    const original = error instanceof Error ? error : new Error(String(error));

    const context = [
      `step ${index + 1} — ${step.action}`,
      state.keys().length > 0 ? `saved values: ${state.keys().join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    original.message = `[${context}]\n${original.message}`;
    return original;
  }
}

/** True for object literals, false for class instances. */
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
