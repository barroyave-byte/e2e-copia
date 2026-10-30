import { FrameworkPlugin } from '../interface';

export class PluginAdminMocks extends FrameworkPlugin {
  pluginBaseName = 'admin.mocks';

  /**
   * @description Makes a fixed number of requests matching the URL pattern fail, then lets
   * later requests through to the real backend. Register before the triggering action.
   */
  async $tf_failRequests({ urlPattern, status = 500 }: { urlPattern: string; status?: number }) {
    await this.context.page.context().route(urlPattern, (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Mocked failure' }),
      })
    );
  }

  /** @description Stops intercepting requests matching the URL pattern. */
  async $tf_restoreRequests({ urlPattern }: { urlPattern: string }) {
    await this.context.page.context().unroute(urlPattern);
  }
}
