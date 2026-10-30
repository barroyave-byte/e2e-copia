import { Context, FrameworkPlugin } from '../interface';

export interface WaitParams {
  milliseconds: number;
}

export class PluginCoreTiming extends FrameworkPlugin {
  pluginBaseName = 'core.timing';

  context!: Context;

  /** @description Pauses the test for the given number of milliseconds. Use only when waiting for backend state that has no observable UI change (e.g. OTP code expiration windows). */
  async $tf_wait({ milliseconds }: WaitParams) {
    await this.context.page.waitForTimeout(milliseconds);
  }
}
