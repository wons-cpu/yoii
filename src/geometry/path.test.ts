import {describe, expect, it} from 'vitest';
import sampleMovement from '../../fixtures/sample-movement.json';
import type {PathPoint} from '../movement/types';
import {filterAccuratePath, projectPath} from './path';

const fixturePath = sampleMovement.path as PathPoint[];

// The fixture is designed to exercise this filter: any point outside this
// set with accuracy > 30m would indicate the fixture changed underneath us.
const FIXTURE_ACCURACY_OUTLIER_INDICES = [7, 34];

describe('filterAccuratePath', () => {
  it('drops the fixture points designed to exercise this (over 30m accuracy)', () => {
    const filtered = filterAccuratePath(fixturePath);
    for (const index of FIXTURE_ACCURACY_OUTLIER_INDICES) {
      expect(fixturePath[index][3]).toBeGreaterThan(30);
      expect(filtered.some(([t]) => t === fixturePath[index][0])).toBe(false);
    }
  });

  it('keeps every remaining point at or under the 30m threshold', () => {
    const filtered = filterAccuratePath(fixturePath);
    expect(filtered.length).toBe(fixturePath.length - FIXTURE_ACCURACY_OUTLIER_INDICES.length);
    expect(filtered.every(([, , , accuracyMeters]) => accuracyMeters <= 30)).toBe(true);
  });
});

describe('projectPath', () => {
  const width = 1080;
  const height = 1920;
  const paddingX = 60;
  const paddingTop = 288;
  const paddingBottom = 288;

  it('fits every point inside the padded canvas', () => {
    const projected = projectPath(fixturePath, {width, height, paddingX, paddingTop, paddingBottom});
    for (const point of projected) {
      expect(point.x).toBeGreaterThanOrEqual(paddingX - 0.01);
      expect(point.x).toBeLessThanOrEqual(width - paddingX + 0.01);
      expect(point.y).toBeGreaterThanOrEqual(paddingTop - 0.01);
      expect(point.y).toBeLessThanOrEqual(height - paddingBottom + 0.01);
    }
  });

  it('excludes the low-accuracy points from the projection', () => {
    const projected = projectPath(fixturePath, {width, height, paddingX, paddingTop, paddingBottom});
    for (const index of FIXTURE_ACCURACY_OUTLIER_INDICES) {
      expect(projected.some((p) => p.t === fixturePath[index][0])).toBe(false);
    }
  });

  it('respects independent horizontal and vertical margins', () => {
    // A route that's much wider than it is tall should still be kept out
    // of a large vertical margin, even though that leaves it far from
    // filling the horizontal margin's tighter bound.
    const wide: PathPoint[] = [
      [0, 0, 0, 5],
      [1000, 0, 1, 5], // ~111km east, negligible north/south
    ];
    const projected = projectPath(wide, {
      width: 1000,
      height: 1000,
      paddingX: 50,
      paddingTop: 400,
      paddingBottom: 400,
    });
    for (const point of projected) {
      expect(point.x).toBeGreaterThanOrEqual(50 - 0.01);
      expect(point.x).toBeLessThanOrEqual(950 + 0.01);
      expect(point.y).toBeGreaterThanOrEqual(400 - 0.01);
      expect(point.y).toBeLessThanOrEqual(600 + 0.01);
    }
  });

  it('keeps the route entirely above an enlarged bottom margin, by construction', () => {
    // This is what reserves the text band: a much larger bottom padding
    // than top should push the whole route (and its available box)
    // upward, never touching the reserved area at all.
    const reservedBandHeight = 180;
    const projected = projectPath(fixturePath, {
      width,
      height,
      paddingX,
      paddingTop: 288,
      paddingBottom: 288 + reservedBandHeight,
    });
    const bandTop = height - 288 - reservedBandHeight;
    for (const point of projected) {
      expect(point.y).toBeLessThanOrEqual(bandTop + 0.01);
    }
  });

  it('orients north as up: larger latitude yields a smaller y', () => {
    const south: PathPoint = [0, 0, 0, 5];
    const north: PathPoint = [1000, 1, 0, 5];
    const [projectedSouth, projectedNorth] = projectPath([south, north], {
      width: 1000,
      height: 1000,
      paddingX: 100,
      paddingTop: 100,
      paddingBottom: 100,
    });
    expect(projectedNorth.y).toBeLessThan(projectedSouth.y);
  });
});
