import {
  expect,
  type Page,
  type Locator,
  type FrameLocator,
  type PageAssertionsToHaveScreenshotOptions,
} from '@playwright/test';

type Viewport = {
  label: string;
  width: number;
  height: number;
};

const DEFAULT_MASK_LOCATOR_SELECTOR = '[data-baseweb="typo-paragraphsmall"]';
// Threshold is set to 0.2 to allow for some differences in the screenshots.
const DEFAULT_THRESHOLD = 0.2;
// Aligned with verifyVisualConsistency so element-scoped checks absorb the same
// cross-OS antialiasing drift the full-page helper already tolerates.
const DEFAULT_ELEMENT_MAX_DIFF_PIXEL_RATIO = 0.05;

/**
 * Visual regression check for full standard pages (no iframes).
 * Captures a fullPage screenshot across each viewport and compares against the baseline.
 *
 * When to use:
 *   - The page renders content directly (no iframes)
 *   - You need multi-viewport coverage (desktop, mobile, tablet)
 *   - Dynamic content (timestamps, prices) can be masked via maskLocators
 *
 * When NOT to use:
 *   - Content lives inside an iframe → use verifyIframeVisualConsistency
 *   - You need to isolate a single DOM element → use verifyElementVisualConsistency
 *   - The iframe has internal layout issues (sticky footers, scroll) → use verifyIframeBodyVisualConsistency
 *
 * @param threshold - Max per-pixel color difference (0–1). Default: 0.2. Raise only if flaky due to font/antialiasing differences.
 * @param maxDiffPixelRatio - Max fraction of total pixels that may differ (0–1). Default: 0.05. Lower for strict color validation.
 */
export async function verifyVisualConsistency(
  page: Page,
  viewports: Viewport[],
  stepName: string,
  options?: Partial<
    Pick<PageAssertionsToHaveScreenshotOptions, 'maxDiffPixelRatio' | 'threshold'>
  > & {
    maskLocators?: Locator[];
  }
): Promise<void> {
  const defaultMaskLocators = options?.maskLocators ?? [
    page.locator(DEFAULT_MASK_LOCATOR_SELECTOR),
  ];
  const effectiveThreshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const effectiveMaxDiffPixelRatio = options?.maxDiffPixelRatio ?? 0.05;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const availableMasks = [];
    for (const maskLocator of defaultMaskLocators) {
      if (await maskLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
        availableMasks.push(maskLocator);
      }
    }

    await expect(page).toHaveScreenshot(`${stepName}-${viewport.label}.png`, {
      fullPage: true,
      mask: availableMasks,
      threshold: effectiveThreshold,
      maxDiffPixelRatio: effectiveMaxDiffPixelRatio,
      animations: 'disabled',
    });
  }
}

interface VerifyIframeVisualConsistencyOptions {
  maskLocators?: Locator[];
  threshold?: number;
  maxDiffPixelRatio?: number;
}

interface VerifyIframeVisualConsistencyParams {
  frameLocator: FrameLocator;
  snapshotName: string;
  viewports: Viewport[];
  targetLocator?: Locator;
  options?: VerifyIframeVisualConsistencyOptions;
}

/**
 * Visual regression check for content inside an iframe.
 * Captures the iframe's target locator (defaults to body) across viewports.
 *
 * When to use:
 *   - The UI to verify is rendered inside an iframe
 *   - You can target a specific locator within the iframe
 *
 * When NOT to use:
 *   - The page has no iframes → use verifyVisualConsistency
 *   - The iframe has sticky/fixed elements causing layout artifacts → use verifyIframeBodyVisualConsistency
 *   - You need to capture a specific host-page element → use verifyElementVisualConsistency
 *
 * @param threshold - Default: 0.2
 * @param maxDiffPixelRatio - Default: 0.1
 */
export async function verifyIframeVisualConsistency({
  frameLocator,
  snapshotName,
  viewports,
  targetLocator,
  options = {},
}: VerifyIframeVisualConsistencyParams): Promise<void> {
  const { maskLocators = [], threshold = 0.2, maxDiffPixelRatio = 0.1 } = options;

  const captureTarget = targetLocator || frameLocator.locator('body');

  for (const viewport of viewports) {
    await captureTarget.page().setViewportSize({ width: viewport.width, height: viewport.height });
    await captureTarget
      .page()
      .locator('iframe.zoid-visible')
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    await captureTarget.waitFor({ state: 'visible' });

    const availableMasks = [];
    for (const maskLocator of maskLocators) {
      if (await maskLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
        availableMasks.push(maskLocator);
      }
    }

    await expect(captureTarget).toHaveScreenshot(`${snapshotName}-${viewport.label}.png`, {
      mask: availableMasks,
      threshold,
      maxDiffPixelRatio,
      animations: 'disabled',
    });
  }
}

async function waitForFrameImagesToLoad(frameLocator: FrameLocator): Promise<void> {
  await frameLocator.locator('body').waitFor({ state: 'visible' });
  await frameLocator
    .locator('img')
    .evaluateAll((images: HTMLImageElement[]) =>
      Promise.all(
        images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {})))
      )
    );
}

async function waitForElementSizeToStabilize(locator: Locator, timeout = 5000): Promise<void> {
  const startTime = Date.now();
  let previousHeight = 0;

  while (Date.now() - startTime < timeout) {
    const box = await locator.boundingBox();
    const currentHeight = box?.height ?? 0;

    if (currentHeight > 0 && currentHeight === previousHeight) {
      return;
    }

    previousHeight = currentHeight;
    await locator.page().waitForTimeout(300);
  }
}

/**
 * Visual regression check for an isolated DOM element by ID.
 * Normalizes the element height across runs to avoid flaky size-driven diffs.
 * Supports iframes embedded within the element and clip-based capture to avoid layout shifts.
 *
 * When to use:
 *   - You need to isolate a specific component or section, not the full page
 *   - The element contains embedded iframes (pass frameLocators)
 *   - Sticky footers or sibling elements would pollute a fullPage screenshot
 *
 * When NOT to use:
 *   - The target is a full page → use verifyVisualConsistency
 *   - The target is inside an iframe → use verifyIframeVisualConsistency or verifyIframeBodyVisualConsistency
 *
 * @param fixedHeight - Pin the element to an exact height to prevent cross-run size drift.
 * @param skipHeightNormalization - Set true when height manipulation causes iframe re-layout issues.
 * @param useClipCapture - Set true when toHaveScreenshot on the locator causes layout shifts (e.g. sticky footer overlap).
 */
export async function verifyElementVisualConsistency(
  page: Page,
  elementId: string,
  viewports: Viewport[],
  stepName: string,
  options?: {
    maskLocators?: Locator[];
    frameLocators?: FrameLocator[];
    threshold?: number;
    maxDiffPixelRatio?: number;
    fixedHeight?: number;
    skipHeightNormalization?: boolean;
    useClipCapture?: boolean;
  }
): Promise<void> {
  const elementLocator = page.locator(`#${elementId}`);
  const effectiveThreshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const effectiveMaxDiffPixelRatio =
    options?.maxDiffPixelRatio ?? DEFAULT_ELEMENT_MAX_DIFF_PIXEL_RATIO;
  const HEIGHT_BUCKET = 100;
  const HEIGHT_BUFFER = 100;

  for (const frameLocator of options?.frameLocators ?? []) {
    await waitForFrameImagesToLoad(frameLocator);
  }

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await waitForElementSizeToStabilize(elementLocator);
    await page.waitForTimeout(500);

    // skipHeightNormalization avoids any DOM mutation. Use when forcing the element
    // height triggers iframe re-layout (sticky footers shift, content overlaps).
    if (!options?.skipHeightNormalization) {
      let normalizedHeight: number;
      if (options?.fixedHeight !== undefined) {
        normalizedHeight = options.fixedHeight;
      } else {
        const measureHeight = async (): Promise<number> => {
          let h = await elementLocator.evaluate((el) => el.getBoundingClientRect().height);
          for (const frameLocator of options?.frameLocators ?? []) {
            const frameHeight = await frameLocator
              .locator('body')
              .evaluate((el) => el.scrollHeight)
              .catch(() => 0);
            h = Math.max(h, frameHeight);
          }
          return h;
        };
        const first = await measureHeight();
        await page.waitForTimeout(500);
        const second = await measureHeight();
        const contentHeight = Math.max(first, second);
        normalizedHeight =
          Math.ceil((contentHeight + HEIGHT_BUFFER) / HEIGHT_BUCKET) * HEIGHT_BUCKET;
      }

      await page.evaluate(
        ({ id, h }) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.height = `${h}px`;
            el.style.overflow = 'hidden';
          }
        },
        { id: elementId, h: normalizedHeight }
      );
    }

    // Blur any focused input inside iframes so focus-ring styles don't appear in screenshots.
    for (const frameLocator of options?.frameLocators ?? []) {
      await frameLocator
        .locator('body')
        .evaluate((body) => {
          const active = body.ownerDocument.activeElement as HTMLElement | null;
          if (active && active !== body.ownerDocument.body) active.blur();
        })
        .catch(() => {});
    }
    await page
      .evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (active) active.blur();
      })
      .catch(() => {});

    // useClipCapture: page.screenshot with clip rect avoids the layout shifts that
    // expect(locator).toHaveScreenshot() can trigger (iframe re-renders, overlapping
    // sticky footers). Captures exactly what's rendered at the element's position.
    // Viewport is grown to fit the full element so clip isn't cut off at viewport bottom.
    if (options?.useClipCapture) {
      const elementHeight = await elementLocator.evaluate(
        (el) => el.getBoundingClientRect().height
      );
      const requiredViewportHeight = Math.ceil(elementHeight) + 200;
      if (requiredViewportHeight > viewport.height) {
        await page.setViewportSize({ width: viewport.width, height: requiredViewportHeight });
        await page.waitForTimeout(500);
      }
      await elementLocator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const rect = await elementLocator.boundingBox();
      if (!rect) throw new Error(`Element #${elementId} has no bounding box`);
      await expect(page).toHaveScreenshot(`${stepName}-${elementId}-${viewport.label}.png`, {
        clip: {
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        },
        mask: options?.maskLocators,
        threshold: effectiveThreshold,
        maxDiffPixelRatio: effectiveMaxDiffPixelRatio,
        animations: 'disabled',
      });
    } else {
      await expect(elementLocator).toHaveScreenshot(
        `${stepName}-${elementId}-${viewport.label}.png`,
        {
          mask: options?.maskLocators,
          threshold: effectiveThreshold,
          maxDiffPixelRatio: effectiveMaxDiffPixelRatio,
          animations: 'disabled',
        }
      );
    }
  }
}

interface VerifyIframeBodyVisualConsistencyParams {
  page: Page;
  frameLocator: FrameLocator;
  snapshotName: string;
  viewports: Viewport[];
  options?: {
    maskLocators?: Locator[];
    threshold?: number;
    maxDiffPixelRatio?: number;
  };
}

/**
 * Visual regression check that captures the iframe body at its natural rendered size.
 * Neutralizes sticky/fixed positioning and expands scrollable containers so all content
 * is visible in a single screenshot without scroll artifacts.
 *
 * When to use:
 *   - The iframe has sticky footers, fixed overlays, or scrollable containers that cause
 *     artifacts with other capture methods
 *   - You want the full iframe body without height manipulation on the host page
 *
 * When NOT to use:
 *   - The page has no iframes → use verifyVisualConsistency
 *   - You only need a specific locator within the iframe → use verifyIframeVisualConsistency
 *   - You need to isolate a host-page element → use verifyElementVisualConsistency
 *
 * @param threshold - Default: 0.2
 * @param maxDiffPixelRatio - Default: 0.1
 */
export async function verifyIframeBodyVisualConsistency({
  page,
  frameLocator,
  snapshotName,
  viewports,
  options = {},
}: VerifyIframeBodyVisualConsistencyParams): Promise<void> {
  const { maskLocators = [], threshold = 0.2, maxDiffPixelRatio = 0.1 } = options;
  const bodyLocator = frameLocator.locator('body');

  await waitForFrameImagesToLoad(frameLocator);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await bodyLocator.waitFor({ state: 'visible' });
    await waitForElementSizeToStabilize(bodyLocator);

    // Expand any scrollable containers and neutralize sticky/fixed positioning
    // inside the iframe so all content flows in normal layout. Without this,
    // sticky footers (e.g. "Powered by" copyright) overlap scrolled-out content
    // when the body is captured in full.
    await bodyLocator.evaluate((body) => {
      const all = body.querySelectorAll<HTMLElement>('*');
      all.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflow === 'auto' ||
          style.overflow === 'scroll'
        ) {
          el.style.overflow = 'visible';
          el.style.maxHeight = 'none';
          el.style.height = 'auto';
        }
        if (style.position === 'sticky' || style.position === 'fixed') {
          el.style.position = 'relative';
        }
      });
    });

    await page.waitForTimeout(500);

    const availableMasks = [];
    for (const maskLocator of maskLocators) {
      if (await maskLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
        availableMasks.push(maskLocator);
      }
    }

    await expect(bodyLocator).toHaveScreenshot(`${snapshotName}.png`, {
      mask: availableMasks,
      threshold,
      maxDiffPixelRatio,
      animations: 'disabled',
    });
  }
}
