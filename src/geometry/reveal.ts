import type {Phrase} from '../movement/types';
import type {ProjectedPoint} from './path';

export interface Point {
  x: number;
  y: number;
}

/** Linear interpolation of the route's position at time `t`, clamped to the route's ends. */
export function interpolateAt(points: ProjectedPoint[], t: number): Point | null {
  if (points.length === 0) {
    return null;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (t <= first.t) {
    return {x: first.x, y: first.y};
  }
  if (t >= last.t) {
    return {x: last.x, y: last.y};
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const frac = span === 0 ? 0 : (t - a.t) / span;
      return {x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac};
    }
  }

  return null;
}

export interface PhraseSegment {
  phraseIndex: number;
  /** The points to actually draw for this phrase at the current progress. */
  points: Point[];
  /**
   * The phrase's full start/end pixel coordinates — fixed at the
   * phrase's true extent regardless of how much of it has been
   * revealed so far. This is what a gradient should be anchored to:
   * the color at a given point on the line must not shift as more of
   * the phrase gets drawn, it should just get uncovered.
   */
  gradientStart: Point;
  gradientEnd: Point;
}

/**
 * Splits the route into one segment per phrase that has started drawing
 * yet, each carrying only the points revealed so far.
 *
 * `progress` is 0..1 over the drawing phase — NOT a fraction of real
 * elapsed walk time. Per CLAUDE.md, each phrase gets an equal share of
 * `progress` regardless of the song's real duration, so the animation
 * has a regular pulse instead of the first songs flashing past.
 *
 * Adjacent phrases share their boundary point exactly (both are
 * `interpolateAt` the same timestamp), so segments always touch with no
 * gap — only the color changes at the seam.
 */
export function revealPhraseSegments(
  points: ProjectedPoint[],
  phrases: Phrase[],
  progress: number,
): PhraseSegment[] {
  if (points.length === 0 || phrases.length === 0) {
    return [];
  }

  const clamped = Math.min(Math.max(progress, 0), 1);
  const phraseCount = phrases.length;
  const scaled = clamped * phraseCount;
  const activeIndex = Math.min(Math.floor(scaled), phraseCount - 1);
  const localProgress = clamped === 1 ? 1 : scaled - activeIndex;

  const segments: PhraseSegment[] = [];

  for (let i = 0; i <= activeIndex; i++) {
    const phrase = phrases[i];
    const gradientStart = interpolateAt(points, phrase.start);
    const gradientEnd = interpolateAt(points, phrase.end);
    if (!gradientStart || !gradientEnd) {
      continue;
    }

    const revealT =
      i < activeIndex ? phrase.end : phrase.start + localProgress * (phrase.end - phrase.start);

    const segmentPoints: Point[] = [gradientStart];
    for (const p of points) {
      if (p.t > phrase.start && p.t < revealT) {
        segmentPoints.push({x: p.x, y: p.y});
      }
    }

    const current = interpolateAt(points, revealT);
    const last = segmentPoints[segmentPoints.length - 1];
    if (current && (!last || last.x !== current.x || last.y !== current.y)) {
      segmentPoints.push(current);
    }

    segments.push({phraseIndex: i, points: segmentPoints, gradientStart, gradientEnd});
  }

  return segments;
}

/** The route's drawn-so-far points at a given moment, flattened across phrases. */
export function computeVisiblePoints(
  points: ProjectedPoint[],
  phrases: Phrase[],
  progress: number,
): Point[] {
  const segments = revealPhraseSegments(points, phrases, progress);

  const visible: Point[] = [];
  for (const segment of segments) {
    for (const point of segment.points) {
      const last = visible[visible.length - 1];
      if (!last || last.x !== point.x || last.y !== point.y) {
        visible.push(point);
      }
    }
  }

  return visible;
}
