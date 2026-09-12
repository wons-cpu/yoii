import {describe, expect, it} from 'vitest';
import type {ProjectedPoint} from './path';
import {
  DEFAULT_DIRECTION,
  DIRECTION_SAMPLE_WINDOW_MS,
  estimateDirectionAt,
  perpendicularUnit,
} from './direction';

describe('estimateDirectionAt', () => {
  it('estimates a clean direction for a straight route', () => {
    const points: ProjectedPoint[] = [
      {t: 0, x: 0, y: 0},
      {t: DIRECTION_SAMPLE_WINDOW_MS, x: 10, y: 0},
      {t: DIRECTION_SAMPLE_WINDOW_MS * 2, x: 20, y: 0},
    ];
    expect(estimateDirectionAt(points, DIRECTION_SAMPLE_WINDOW_MS)).toEqual({x: 20, y: 0});
  });

  it('is not tilted by a single noisy point the single-segment tangent would catch', () => {
    // The midpoint jogs off-axis — a tangent through just the adjacent
    // segment would tilt sharply, but the wide before/after baseline
    // skips right over it.
    const noisy: ProjectedPoint[] = [
      {t: 0, x: 0, y: 0},
      {t: DIRECTION_SAMPLE_WINDOW_MS, x: 10, y: 8},
      {t: DIRECTION_SAMPLE_WINDOW_MS * 2, x: 20, y: 0},
    ];
    expect(estimateDirectionAt(noisy, DIRECTION_SAMPLE_WINDOW_MS)).toEqual({x: 20, y: 0});
  });

  it('returns null for a degenerate (near-zero) vector', () => {
    const stationary: ProjectedPoint[] = [
      {t: 0, x: 5, y: 5},
      {t: DIRECTION_SAMPLE_WINDOW_MS * 2, x: 5, y: 5},
    ];
    expect(estimateDirectionAt(stationary, DIRECTION_SAMPLE_WINDOW_MS)).toBeNull();
  });
});

describe('perpendicularUnit', () => {
  it('rotates a vector 90 degrees and normalizes it to unit length', () => {
    const a = perpendicularUnit({x: 5, y: 0});
    expect(a.x).toBeCloseTo(0);
    expect(a.y).toBeCloseTo(1);

    const b = perpendicularUnit({x: 0, y: 3});
    expect(b.x).toBeCloseTo(-1);
    expect(b.y).toBeCloseTo(0);
  });
});

describe('DEFAULT_DIRECTION', () => {
  it('is non-degenerate, so it always yields a valid perpendicular', () => {
    expect(DEFAULT_DIRECTION.x !== 0 || DEFAULT_DIRECTION.y !== 0).toBe(true);
  });
});
