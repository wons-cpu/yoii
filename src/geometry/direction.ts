import {interpolateAt} from './reveal';
import type {ProjectedPoint} from './path';

/**
 * How far before/after a boundary time to sample when estimating the
 * route's local direction there. A wider baseline is less sensitive to
 * any single noisy GPS point than the adjacent segment would be, but too
 * wide risks blending in unrelated geometry near a sharp turn — a skip
 * near a corner could end up averaging across two different streets.
 * This is the knob to retune once real data comes in.
 */
export const DIRECTION_SAMPLE_WINDOW_MS = 45_000;

/** Below this length (in projected pixels) a direction vector is treated
 * as degenerate — e.g. the walker was stationary through the window. */
const MIN_DIRECTION_LENGTH = 0.5;

export interface Vector {
  x: number;
  y: number;
}

/** Used only when no direction could be estimated at all (see `estimateDirectionAt`). */
export const DEFAULT_DIRECTION: Vector = {x: 1, y: 0};

function length(v: Vector): number {
  return Math.hypot(v.x, v.y);
}

/**
 * Estimates the route's local direction at time `t` from the vector
 * between a point `DIRECTION_SAMPLE_WINDOW_MS` before it and one after,
 * rather than the single adjacent segment — any one noisy GPS point
 * could tilt that. Returns null if the resulting vector is degenerate,
 * so the caller can fall back sensibly.
 */
export function estimateDirectionAt(points: ProjectedPoint[], t: number): Vector | null {
  const before = interpolateAt(points, t - DIRECTION_SAMPLE_WINDOW_MS);
  const after = interpolateAt(points, t + DIRECTION_SAMPLE_WINDOW_MS);
  if (!before || !after) {
    return null;
  }

  const vector: Vector = {x: after.x - before.x, y: after.y - before.y};
  return length(vector) < MIN_DIRECTION_LENGTH ? null : vector;
}

/** Rotates a vector 90° and scales it to unit length. */
export function perpendicularUnit(vector: Vector): Vector {
  const rotated: Vector = {x: -vector.y, y: vector.x};
  const len = length(rotated);
  return {x: rotated.x / len, y: rotated.y / len};
}
