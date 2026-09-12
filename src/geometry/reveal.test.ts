import {describe, expect, it} from 'vitest';
import type {Phrase} from '../movement/types';
import {computeVisiblePoints, interpolateAt, revealPhraseSegments} from './reveal';
import type {ProjectedPoint} from './path';

const points: ProjectedPoint[] = [
  {t: 0, x: 0, y: 0},
  {t: 190, x: 19, y: 0},
  {t: 200, x: 20, y: 0},
];

describe('interpolateAt', () => {
  it('clamps to the first point before the route starts', () => {
    expect(interpolateAt(points, -50)).toEqual({x: 0, y: 0});
  });

  it('clamps to the last point after the route ends', () => {
    expect(interpolateAt(points, 500)).toEqual({x: 20, y: 0});
  });

  it('linearly interpolates between two points', () => {
    expect(interpolateAt(points, 95)).toEqual({x: 9.5, y: 0});
  });
});

describe('computeVisiblePoints', () => {
  // Deliberately unequal real durations: phrase "a" covers 95% of the real
  // timeline, phrase "b" only the last 5%. Equal-time-per-phrase means each
  // still gets exactly half of the drawing progress.
  const phrases: Phrase[] = [
    {uri: 'a', start: 0, end: 190, fromMs: 0, toMs: 190, ending: 'completed', source: 'poll'},
    {uri: 'b', start: 190, end: 200, fromMs: 0, toMs: 10, ending: 'completed', source: 'poll'},
  ];

  it('draws nothing but the start point before playback begins', () => {
    expect(computeVisiblePoints(points, phrases, 0)).toEqual([{x: 0, y: 0}]);
  });

  it('is only partway through phrase "a" at 25% overall progress', () => {
    // half of phrase a's budget -> halfway through its real time span
    const visible = computeVisiblePoints(points, phrases, 0.25);
    expect(visible[visible.length - 1]).toEqual({x: 9.5, y: 0});
  });

  it('reaches the phrase boundary at 50% overall progress, not 95%', () => {
    const visible = computeVisiblePoints(points, phrases, 0.5);
    expect(visible[visible.length - 1]).toEqual({x: 19, y: 0});
  });

  it('draws the full route at progress 1', () => {
    const visible = computeVisiblePoints(points, phrases, 1);
    expect(visible).toEqual([
      {x: 0, y: 0},
      {x: 19, y: 0},
      {x: 20, y: 0},
    ]);
  });
});

describe('revealPhraseSegments', () => {
  const phrases: Phrase[] = [
    {uri: 'a', start: 0, end: 190, fromMs: 0, toMs: 190, ending: 'completed', source: 'poll'},
    {uri: 'b', start: 190, end: 200, fromMs: 0, toMs: 10, ending: 'completed', source: 'poll'},
  ];

  it('only includes phrases that have started drawing', () => {
    const segments = revealPhraseSegments(points, phrases, 0);
    expect(segments.map((s) => s.phraseIndex)).toEqual([0]);
  });

  it('keeps a gradient anchored to the phrase\'s full extent even mid-reveal', () => {
    // At 25% overall progress we're only halfway through phrase "a"'s
    // points, but its gradient end must already be its true, full end —
    // otherwise the color at a point would shift later as more is drawn.
    const segments = revealPhraseSegments(points, phrases, 0.25);
    const [segmentA] = segments;
    expect(segmentA.points[segmentA.points.length - 1]).toEqual({x: 9.5, y: 0});
    expect(segmentA.gradientStart).toEqual({x: 0, y: 0});
    expect(segmentA.gradientEnd).toEqual({x: 19, y: 0});
  });

  it('shares an identical boundary point between adjacent phrases so they touch with no gap', () => {
    const segments = revealPhraseSegments(points, phrases, 1);
    const [segmentA, segmentB] = segments;
    expect(segmentA.points[segmentA.points.length - 1]).toEqual(segmentB.points[0]);
    expect(segmentA.gradientEnd).toEqual(segmentB.gradientStart);
  });
});
