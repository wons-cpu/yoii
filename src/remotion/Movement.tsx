import {useMemo} from 'react';
import type {FC} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {Movement as MovementData} from '../movement/types';
import {projectPath} from '../geometry/path';
import {revealPhraseSegments} from '../geometry/reveal';
import type {Point} from '../geometry/reveal';
import {DEFAULT_DIRECTION, estimateDirectionAt, perpendicularUnit} from '../geometry/direction';
import type {Vector} from '../geometry/direction';
import {brighterOf} from './colors';
import {buildMetaLine} from './meta';
import {PALETTE} from './palette';
import {toRomanNumeral} from './roman';

export type MovementProps = {
  movement: MovementData;
  /** Frames given to drawing the route before it holds on the final frame. */
  drawDurationInFrames: number;
};

const WIDTH = 1080;
const HEIGHT = 1920;

// Instagram Stories overlay UI sits in the top/bottom ~15% of the frame
// (CLAUDE.md "Visual spec") — the route must stay clear of it entirely,
// not just text. Horizontally there's no such constraint, so the route
// can run close to the edges to fill more of the frame.
const SAFE_VERTICAL_MARGIN = HEIGHT * 0.15;
const HORIZONTAL_MARGIN = 24;

// A fixed band, reserved above the bottom safe margin, for the numeral
// and meta line (CLAUDE.md "Visual spec"). The route projects only into
// the space above this band, so the two can never overlap — no
// collision detection needed, and no compromise placement to get wrong.
const TEXT_BAND_HEIGHT = 180;
const TEXT_BAND_TOP = HEIGHT - SAFE_VERTICAL_MARGIN - TEXT_BAND_HEIGHT;

const STROKE_WIDTH = 10;

// Hollow and filled dots must read as the same size. One constant drives
// both radii so their outer edges land on the exact same diameter.
const DOT_OUTER_DIAMETER = 40;
const DOT_STROKE_WIDTH = STROKE_WIDTH;
const HOLLOW_DOT_RADIUS = (DOT_OUTER_DIAMETER - DOT_STROKE_WIDTH) / 2;
const FILLED_DOT_RADIUS = DOT_OUTER_DIAMETER / 2;

// Starting point per CLAUDE.md's bar-mark spec — a short perpendicular
// tick, sized relative to the line it crosses. Retune after seeing it
// rendered against real geometry.
const BAR_LENGTH = STROKE_WIDTH * 3;

// City isn't in the movement JSON yet — the data contract (CLAUDE.md) has
// no location field, so there's nothing to read. Hardcoded until week 2's
// recording flow adds a real one.
const HARDCODED_CITY = 'Atlanta';

const TEXT_MARGIN = 64;
// The numeral is the second subject of the frame after the route itself.
const NUMBER_FONT_SIZE = 96;
const META_FONT_SIZE = 32;
const NUMERAL_BASELINE_Y = TEXT_BAND_TOP + NUMBER_FONT_SIZE;
const META_BASELINE_Y = NUMERAL_BASELINE_Y + 56;

/** A track's two-color pair, falling back if the track is missing. */
function trackColors(movement: MovementData, uri: string): [string, string] {
  return movement.tracks[uri]?.colors ?? [PALETTE.routePlaceholder, PALETTE.routePlaceholder];
}

/**
 * Draws a movement's route: one phrase at a time, each stroked with a
 * gradient between its track's two colors so phrase boundaries read as
 * color changes with no gap in the line. A hollow dot marks the start,
 * a filled dot marks the end once the route is fully drawn — both in
 * whichever of their phrase's two colors reads brighter, so they stay
 * visible against the dark background regardless of which color happens
 * to be the darker "shadow" tone. A skipped phrase gets a bar mark: a
 * short tick across the route at that phrase's end, angled to the
 * route's local direction there. Once the route finishes drawing and
 * holds, the movement number (in Roman numerals) and a meta line of
 * date/city/temperature/duration appear in a fixed band at the bottom of
 * the frame, which the route never projects into.
 *
 * No map tiles yet — see CLAUDE.md "Visual spec" for what's coming next.
 */
export const Movement: FC<MovementProps> = ({movement, drawDurationInFrames}) => {
  const frame = useCurrentFrame();

  const projected = useMemo(
    () =>
      projectPath(movement.path, {
        width: WIDTH,
        height: HEIGHT,
        paddingX: HORIZONTAL_MARGIN,
        paddingTop: SAFE_VERTICAL_MARGIN,
        paddingBottom: SAFE_VERTICAL_MARGIN + TEXT_BAND_HEIGHT,
      }),
    [movement.path],
  );

  const progress = Math.min(frame / drawDurationInFrames, 1);

  const segments = useMemo(
    () => revealPhraseSegments(projected, movement.phrases, progress),
    [projected, movement.phrases, progress],
  );

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const activeIndex = lastSegment?.phraseIndex ?? -1;
  const showEndDot = progress >= 1 && lastSegment !== undefined;

  const ticks = useMemo(() => {
    const marks: {position: Point; direction: Vector}[] = [];
    // Carries forward across boundaries so a degenerate estimate at one
    // skip can fall back to the last real direction nearby, rather than
    // jumping straight to the arbitrary default.
    let lastDirection = DEFAULT_DIRECTION;

    for (const segment of segments) {
      // A phrase's boundary is only "settled" once it's no longer the
      // one currently being drawn — same rule as showEndDot, per phrase.
      const isFullyRevealed = segment.phraseIndex < activeIndex || progress >= 1;
      if (!isFullyRevealed) {
        continue;
      }

      const phrase = movement.phrases[segment.phraseIndex];
      const estimated = estimateDirectionAt(projected, phrase.end);
      const direction = estimated ?? lastDirection;
      if (estimated) {
        lastDirection = estimated;
      }
      if (phrase.ending === 'skipped') {
        marks.push({position: segment.gradientEnd, direction});
      }
    }

    return marks;
  }, [segments, projected, movement.phrases, activeIndex, progress]);

  const showText = progress >= 1;
  const romanNumeral = toRomanNumeral(movement.number);
  const metaLine = buildMetaLine(movement, HARDCODED_CITY);

  return (
    <AbsoluteFill style={{backgroundColor: PALETTE.background}}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          {segments.map((segment) => {
            const phrase = movement.phrases[segment.phraseIndex];
            const [from, to] = trackColors(movement, phrase.uri);
            return (
              <linearGradient
                key={segment.phraseIndex}
                id={`phrase-gradient-${segment.phraseIndex}`}
                gradientUnits="userSpaceOnUse"
                x1={segment.gradientStart.x}
                y1={segment.gradientStart.y}
                x2={segment.gradientEnd.x}
                y2={segment.gradientEnd.y}
              >
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            );
          })}
        </defs>

        {segments.map((segment) => {
          if (segment.points.length < 2) {
            return null;
          }
          const points = segment.points.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polyline
              key={segment.phraseIndex}
              points={points}
              fill="none"
              stroke={`url(#phrase-gradient-${segment.phraseIndex})`}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {ticks.map((tick, index) => {
          const perpendicular = perpendicularUnit(tick.direction);
          const half = BAR_LENGTH / 2;
          return (
            <line
              key={index}
              x1={tick.position.x - perpendicular.x * half}
              y1={tick.position.y - perpendicular.y * half}
              x2={tick.position.x + perpendicular.x * half}
              y2={tick.position.y + perpendicular.y * half}
              stroke={PALETTE.barMark}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          );
        })}

        {firstSegment && (
          <circle
            cx={firstSegment.gradientStart.x}
            cy={firstSegment.gradientStart.y}
            r={HOLLOW_DOT_RADIUS}
            fill={PALETTE.background}
            stroke={brighterOf(trackColors(movement, movement.phrases[firstSegment.phraseIndex].uri))}
            strokeWidth={DOT_STROKE_WIDTH}
          />
        )}

        {showEndDot && lastSegment && (
          <circle
            cx={lastSegment.gradientEnd.x}
            cy={lastSegment.gradientEnd.y}
            r={FILLED_DOT_RADIUS}
            fill={brighterOf(trackColors(movement, movement.phrases[lastSegment.phraseIndex].uri))}
          />
        )}

        {showText && (
          <>
            <text
              x={TEXT_MARGIN}
              y={NUMERAL_BASELINE_Y}
              fontFamily="sans-serif"
              fontSize={NUMBER_FONT_SIZE}
              fontWeight={600}
              fill={PALETTE.primaryText}
            >
              {romanNumeral}
            </text>
            <text
              x={TEXT_MARGIN}
              y={META_BASELINE_Y}
              fontFamily="sans-serif"
              fontSize={META_FONT_SIZE}
              fill={PALETTE.secondaryText}
            >
              {metaLine}
            </text>
            <text
              x={WIDTH - TEXT_MARGIN}
              y={META_BASELINE_Y}
              textAnchor="end"
              fontFamily="sans-serif"
              fontSize={META_FONT_SIZE}
              fill={PALETTE.secondaryText}
            >
              Yoii
            </text>
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};
