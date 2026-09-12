/** Parses a `#rrggbb` hex color into 0-255 RGB components. */
function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Perceived brightness (ITU-R BT.601 luma), 0-255. */
function perceivedBrightness(hex: string): number {
  const {r, g, b} = hexToRgb(hex);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/**
 * Picks whichever of a track's two colors reads brighter. Used for the
 * start/end dots, which need to stay visible against the dark background
 * regardless of which of the two extracted colors happens to be the
 * darker "shadow" tone.
 */
export function brighterOf([a, b]: [string, string]): string {
  return perceivedBrightness(a) >= perceivedBrightness(b) ? a : b;
}
