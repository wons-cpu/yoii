import type {PathPoint} from '../movement/types';

/**
 * Drop path points below GPS accuracy. See CLAUDE.md "Data contract" —
 * the fixture's index 7 (38m) exists specifically to exercise this: it
 * visibly kinks the route if it isn't dropped.
 */
export function filterAccuratePath(path: PathPoint[], maxAccuracyM = 30): PathPoint[] {
  return path.filter(([, , , accuracyMeters]) => accuracyMeters <= maxAccuracyM);
}

export interface ProjectedPoint {
  t: number;
  x: number;
  y: number;
}

export interface ProjectPathOptions {
  width: number;
  height: number;
  /** Margin kept empty on the left/right edges. */
  paddingX: number;
  /**
   * Margin kept empty above the route. Independent of `paddingX` because
   * it's driven by a different constraint — the Instagram Stories
   * overlay UI, not just visual breathing room (see CLAUDE.md "Visual
   * spec").
   */
  paddingTop: number;
  /**
   * Margin kept empty below the route. Independent of `paddingTop` so
   * the renderer can reserve extra room at the bottom for the text band
   * — the route projects only into the space above it, by construction,
   * so the two can never overlap.
   */
  paddingBottom: number;
  maxAccuracyM?: number;
}

const METERS_PER_DEGREE_LAT = 111_320;

function metersPerDegreeLng(latDeg: number): number {
  return METERS_PER_DEGREE_LAT * Math.cos((latDeg * Math.PI) / 180);
}

/**
 * Filters the raw path by accuracy, then projects lat/lng onto canvas
 * pixels: an equirectangular approximation (fine at walking scale),
 * scaled and centered so the whole route fits inside the padded canvas.
 * North is up — larger latitude yields a smaller y.
 *
 * No map tiles this week (CLAUDE.md), so this is the only geometry the
 * renderer needs: the route drawn on the flat background.
 */
export function projectPath(path: PathPoint[], options: ProjectPathOptions): ProjectedPoint[] {
  const filtered = filterAccuratePath(path, options.maxAccuracyM ?? 30);
  if (filtered.length === 0) {
    return [];
  }

  const lat0 = filtered[0][1];
  const lng0 = filtered[0][2];
  const lngScale = metersPerDegreeLng(lat0);

  const local = filtered.map(([t, lat, lng]) => ({
    t,
    mx: (lng - lng0) * lngScale,
    my: (lat - lat0) * METERS_PER_DEGREE_LAT,
  }));

  const xs = local.map((p) => p.mx);
  const ys = local.map((p) => p.my);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Guard against a degenerate (single-point or straight-line) route.
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const availableW = options.width - options.paddingX * 2;
  const availableH = options.height - options.paddingTop - options.paddingBottom;
  const scale = Math.min(availableW / spanX, availableH / spanY);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  // Vertical center of the available box, not the canvas — asymmetric
  // top/bottom padding shifts the route up or down accordingly.
  const canvasCenterY = options.paddingTop + availableH / 2;

  return local.map(({t, mx, my}) => ({
    t,
    x: options.width / 2 + (mx - centerX) * scale,
    y: canvasCenterY - (my - centerY) * scale,
  }));
}
