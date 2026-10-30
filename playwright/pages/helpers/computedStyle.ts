import { expect, Locator } from '@playwright/test';
import { ThemeControls } from '@support/interfaces/CheckoutConfigurationV2';

/**
 * Element-agnostic computed-style assertions shared by every widget page.
 * Only the token -> locator mapping is widget-specific, so it stays in each page.
 */

/** Inputs carry their border styles on the parent wrapper, not on the input itself. */
export function wrapperFor(input: Locator): Locator {
  return input.locator('xpath=..');
}

/**
 * Base primitive: polls a computed CSS property until it settles on the expected value.
 * `timeout` overrides the global `expect.timeout` (playwright.config.ts) for this single
 * poll — pass a short one (e.g. 1000ms) for assertions that must fail fast because the
 * value is expected to already be stable/synchronous, with no pending async work.
 */
export async function assertComputedStyle(
  element: Locator,
  property: string,
  expectedValue: string,
  timeout?: number
) {
  await expect(element).toBeVisible({ timeout });
  await expect
    .poll(
      async () =>
        (
          await element.evaluate(
            (el, prop) => getComputedStyle(el).getPropertyValue(prop),
            property
          )
        ).trim(),
      { message: `Expected computed "${property}" to settle on ${expectedValue}`, timeout }
    )
    .toBe(expectedValue);
}

/**
 * Compares a computed color property against a theme hex token.
 *
 * `getComputedStyle` returns a color in whatever color function it was
 * AUTHORED with, it does not normalize to a single format: a plain hex/rgb
 * value serializes back as `rgb(...)`, but the design system's CSS custom
 * properties are authored with Tailwind v4's default color space (oklch), so
 * a color that's genuinely equal to `#66D19E` can legitimately serialize as
 * `oklch(0.527 0.154 150.069)`. Comparing that against a hand-built
 * `rgb(...)` string — or even against a *second* computed value derived from
 * a plain hex probe (which itself stays `rgb(...)`, never becomes oklch) —
 * always fails on format alone, regardless of whether the color is right.
 *
 * The fix has to normalize BOTH sides through the same conversion, not just
 * read them both as strings. Canvas 2D's `fillStyle` does exactly that: set
 * it to any valid CSS color (oklch, lab, hsl, rgb, hex, named) and reading it
 * back always returns the same browser-internal serialization for the same
 * underlying color, regardless of which color function it was expressed in.
 */
export async function assertComputedColor(
  element: Locator,
  property: string,
  expectedHex: string,
  timeout?: number
) {
  await expect(element).toBeVisible({ timeout });

  // Normalizing the expected hex doesn't depend on any live/changing state,
  // so it's done once up front, not on every poll.
  const normalizedExpected = await element.evaluate((_el, hex) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = hex;
    return ctx.fillStyle;
  }, expectedHex);

  await expect
    .poll(
      async () =>
        element.evaluate((el, prop) => {
          const raw = getComputedStyle(el).getPropertyValue(prop).trim();
          const ctx = document.createElement('canvas').getContext('2d')!;
          ctx.fillStyle = raw;
          return ctx.fillStyle;
        }, property),
      {
        message: `Expected computed "${property}" to resolve to the same color as ${expectedHex} (normalized: ${normalizedExpected})`,
        timeout,
      }
    )
    .toBe(normalizedExpected);
}

export async function assertComputedBackgroundColor(element: Locator, expectedHex: string) {
  await assertComputedColor(element, 'background-color', expectedHex);
}

export async function assertBorderRadius(element: Locator, expectedBorderRadius: string) {
  await assertComputedStyle(element, 'border-radius', expectedBorderRadius);
}

export async function assertComputedHeight(element: Locator, expectedHeight: string) {
  await assertComputedStyle(element, 'height', expectedHeight);
}

export async function assertInputBorderColor(
  input: Locator,
  expectedHex: string,
  timeout?: number
) {
  await assertComputedColor(wrapperFor(input), 'border-top-color', expectedHex, timeout);
}

/**
 * Dropdown/Select-type components carry their border directly on the element
 * matched by their `id` — unlike text inputs, there's no separate bordered
 * wrapper one level up. Checking `wrapperFor(dropdown)` here lands on an
 * ancestor with no border of its own, which resolves `border-color` to
 * whatever `color` (e.g. the theme's `primaryTextColor`) it inherits instead.
 */
export async function assertDropdownBorderColor(
  dropdown: Locator,
  expectedHex: string,
  timeout?: number
) {
  await assertComputedColor(dropdown, 'border-top-color', expectedHex, timeout);
}

/** Asserts whichever dimensions the theme config actually defines. */
export async function assertDimensions(element: Locator, { borderRadius, height }: ThemeControls) {
  if (borderRadius) {
    await assertBorderRadius(element, borderRadius);
  }
  if (height) {
    await assertComputedHeight(element, height);
  }
}

/** Same as assertDimensions, applied to every element in a collection. */
export async function assertDimensionsForAll(collection: Locator, controls: ThemeControls) {
  await collection.first().waitFor();
  const count = await collection.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await assertDimensions(collection.nth(i), controls);
  }
}
