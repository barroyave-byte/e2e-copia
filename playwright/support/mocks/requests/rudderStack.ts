import { Route } from '@playwright/test';

export const mockRudderStack = async (route: Route) => {
  const url = route.request().url();

  if (url.includes('getdunadejzpd.dataplane.rudderstack.com/v1/identify')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, mockRequest: true }),
    });
    return;
  }

  if (url.includes('getdunadejzpd.dataplane.rudderstack.com/v1/track')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, mockRequest: true }),
    });
    return;
  }

  if (url.includes('api.rudderstack.com/sourceConfig')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mockRequest: true,
        source: {
          id: '2Oc3v35vXcu9rjrAzyLqsIhLOtB',
          name: 'Checkout Modular Web - Staging',
          writeKey: '2Oc3v4G3X6fgFaPZTx1YUTznQvp',
          config: {
            statsCollection: {
              errors: {
                enabled: false,
              },
              metrics: {
                enabled: false,
              },
            },
          },
          enabled: true,
          workspaceId: '1s6crEhnH58k09By4x2qPKvJzPd',
          destinations: [],
          updatedAt: '2026-01-06T20:22:22.444Z',
          dataplanes: {},
        },
        updatedAt: '2026-01-06T20:22:22.788Z',
        consentManagementMetadata: {
          providers: [
            {
              provider: 'oneTrust',
              resolutionStrategy: 'and',
            },
            {
              provider: 'ketch',
              resolutionStrategy: 'or',
            },
            {
              provider: 'iubenda',
              resolutionStrategy: 'or',
            },
          ],
        },
      }),
    });
    return;
  }

  // Continue with the rest of the requests
  await route.continue();
};
