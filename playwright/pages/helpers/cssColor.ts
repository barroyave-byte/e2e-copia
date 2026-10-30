interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const parseHex = (color: string): Rgba | null => {
  let hex = color.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (hex.length !== 6) {
    return null;
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
};

// This is the only function syntax `getComputedStyle` ever returns:
// `rgb(0, 51, 204)` or `rgba(0, 51, 204, 0.8)`.
const parseRgbFunction = (color: string): Rgba | null => {
  const match = color.match(/^rgba?\(([^)]+)\)$/i);
  const parts = match?.[1].split(',').map((part) => parseFloat(part));

  if (!parts || parts.length < 3) {
    return null;
  }

  const [r, g, b, a = 1] = parts;
  return { r, g, b, a };
};

const parseColor = (color: string): Rgba | null => {
  const value = color.trim();
  return value.startsWith('#') ? parseHex(value) : parseRgbFunction(value);
};

/** True when the expected color declares an explicit alpha channel, i.e. `rgba(...)`. */
export const declaresAlpha = (color: string): boolean => /^rgba\(/i.test(color.trim());

/**
 * Canonical representation of a CSS color, so a hex written in the test data can
 * be compared against whatever `getComputedStyle` reports.
 *
 * `includeAlpha: false` drops the alpha channel from the comparison: the legacy
 * widget renders opaque `rgb(...)` where the current one renders `rgba(...)`, so
 * an expectation that does not declare an alpha must accept both.
 *
 * Unparseable values (e.g. named CSS colors like `white`) are returned trimmed
 * but untouched — same fallback the previous hex-only helper had.
 */
export const normalizeColor = (color: string, includeAlpha = true): string => {
  const parsed = parseColor(color);

  if (!parsed) {
    return color.trim();
  }

  const { r, g, b, a } = parsed;
  return includeAlpha ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
};
