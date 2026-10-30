import { Context, FrameworkPlugin } from '../interface';

export class PluginApiGuard extends FrameworkPlugin {
  pluginBaseName = 'api.guard';

  setTestContext(context: Context) {
    super.setTestContext(context);
  }

  /** @description Asserts the fraud guard status for the current order via API. Not yet connected to page object. */
  async $tf_assertFraudStatus(params?: { status?: string }) {
    throw new Error('Not yet connected to page object');
  }

  /** @description Retrieves the list of payments pending fraud guard review via API. Not yet connected to page object. */
  async $tf_getPaymentsToGuard(params?: { filters?: Record<string, any> }) {
    throw new Error('Not yet connected to page object');
  }

  /** @description Enables or disables shadow mode for the fraud guard processor via API. Not yet connected to page object. */
  async $tf_setShadowMode(params: { enabled: boolean }) {
    throw new Error('Not yet connected to page object');
  }
}
