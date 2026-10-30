import { Page } from '@deuna/test';
import envConfig from '@support/envConfig';
import { WebSDKInitConfig, WebSDKWidgetConfig, WebSDKResponse } from './interfaces';

declare global {
  interface Window {
    initWebSDK: (config: WebSDKInitConfig) => WebSDKResponse;
    initPaymentWidget: (config: WebSDKWidgetConfig) => WebSDKResponse;
    initElements: (config: WebSDKWidgetConfig) => WebSDKResponse;
  }
}

export class WebSDKClient {
  constructor(private page: Page) {}

  async init(config: WebSDKInitConfig) {
    return this.page.evaluate(
      cfg => window.initWebSDK(cfg),
      { env: envConfig.NODE_ENV, ...config}
    )
  }

  async openPaymentWidget(config: WebSDKWidgetConfig) {
    return this.page.evaluate(
      cfg => window.initPaymentWidget(cfg),
      config
    )
  }

  async openElements(config: WebSDKWidgetConfig) {
    return this.page.evaluate(
      cfg => window.initElements(cfg),
      config
    )
  }
}
