import { FrameworkPlugin } from '../interface';
import { commonViewportSets } from '@visual/utils/viewports';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';

type ViewportSetKey = keyof typeof commonViewportSets;

export interface VerifyCheckoutIframeParams {
  snapshotName: string;
  /** Viewport set to capture. Defaults to 'desktopAndFullscreen'. */
  viewports?: ViewportSetKey;
}

export class PluginVisualCheckout extends FrameworkPlugin {
  pluginBaseName = 'visual';

  /** @description Captures a visual snapshot of the checkout iframe (iframe.zoid-visible) across the specified viewport set and compares it against the baseline. Uses verifyIframeVisualConsistency internally. */
  async $tf_verifyCheckoutIframe({
    snapshotName,
    viewports = 'desktopAndFullscreen',
  }: VerifyCheckoutIframeParams) {
    const frameLocator = this.context.page.frameLocator('iframe.zoid-visible');
    await verifyIframeVisualConsistency({
      frameLocator,
      snapshotName,
      viewports: commonViewportSets[viewports],
    });
  }
}
