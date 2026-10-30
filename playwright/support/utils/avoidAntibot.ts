// Avoid antibot detection for third-party payment SDKs (e.g. Mastercard Click to Pay)
// and payment processor callbacks (e.g. Redsys 3DS Method notification) that reject
// requests coming from a headless browser.
import { Page } from '@playwright/test';

// Headless Chrome leaks "HeadlessChrome" in the sec-ch-ua Client Hints headers.
// route.continue({ headers }) CANNOT fix this: Chromium's network service
// recomputes sec-ch-ua/-mobile/-platform from its internal UserAgentMetadata after
// request interception runs, so any header override attempted there is silently
// discarded — verified empirically (0/226 requests changed in a real run). The only
// way to change what Chromium reports is to overwrite that internal metadata itself
// via the CDP Network.setUserAgentOverride command.
// The Client Hints must agree with the User-Agent string. Browser.getVersion returns
// the UA of the machine running the browser (macOS locally, Linux on CI), which is NOT
// the UA the context is configured with (devices['Desktop Chrome'] sets a Windows one).
// Overriding with it produced a "Macintosh" UA next to a sec-ch-ua-platform of
// "Windows" — the exact kind of mismatch a WAF rejects. Read the page's effective UA
// instead and derive the platform hints from it.
const platformHintsFor = (userAgent: string): { platform: string; platformVersion: string } => {
  if (userAgent.includes('Windows')) return { platform: 'Windows', platformVersion: '10.0.0' };
  if (userAgent.includes('Macintosh')) return { platform: 'macOS', platformVersion: '10.15.7' };
  return { platform: 'Linux', platformVersion: '' };
};

const patchUserAgentMetadata = async (page: Page) => {
  const client = await page.context().newCDPSession(page);
  const currentUserAgent = await page.evaluate(() => navigator.userAgent);
  const userAgent = currentUserAgent.replace('HeadlessChrome', 'Chrome');
  const version = userAgent.match(/(?:Headless)?Chrome\/([\d.]+)/)?.[1] ?? '128.0.0.0';
  const majorVersion = version.split('.')[0];
  const { platform, platformVersion } = platformHintsFor(userAgent);

  await client.send('Network.setUserAgentOverride', {
    userAgent,
    userAgentMetadata: {
      platform,
      platformVersion,
      architecture: 'x86',
      model: '',
      mobile: false,
      brands: [
        { brand: 'Not)A;Brand', version: '99' },
        { brand: 'Google Chrome', version: majorVersion },
        { brand: 'Chromium', version: majorVersion },
      ],
      fullVersionList: [
        { brand: 'Not)A;Brand', version: '99.0.0.0' },
        { brand: 'Google Chrome', version },
        { brand: 'Chromium', version },
      ],
    },
  });
};

export const avoidAntibot = async (page: Page) => {
  await patchUserAgentMetadata(page);
  // Covers popups opened later — e.g. the Redsys 3DS challenge window — since the
  // leak also happens on the browser-to-issuer notification call made from inside it.
  page.context().on('page', (newPage) => {
    patchUserAgentMetadata(newPage).catch(() => {
      // Best-effort: if the popup closes before the CDP session attaches, skip it.
    });
  });
};
