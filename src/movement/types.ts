/**
 * Types for the movement data contract. See CLAUDE.md "Data contract" —
 * this shape is fixed, it's what the app will produce in week 2.
 *
 * All times (`t`, `start`, `end`, `fromMs`, `toMs`) are milliseconds
 * relative to `startedAt`. Never absolute, never seconds.
 */

/** `[t, lat, lng, accuracyMeters]` */
export type PathPoint = [t: number, lat: number, lng: number, accuracyMeters: number];

/** `[t, uri, progressMs, isPlaying]` — a raw 30s snapshot. Evidence, not events. */
export type Poll = [t: number, uri: string, progressMs: number, isPlaying: boolean];

export type PhraseEnding = 'completed' | 'skipped' | 'trip_ended';
export type PhraseSource = 'poll' | 'inferred';

/** One song's stretch of the route. The renderer reads phrases, not polls. */
export interface Phrase {
  uri: string;
  start: number;
  end: number;
  fromMs: number;
  toMs: number;
  ending: PhraseEnding;
  source: PhraseSource;
}

export interface Track {
  name: string;
  artists: string[];
  durationMs: number;
  artUrl: string | null;
  /** Two colors extracted from the album art at record time. */
  colors: [string, string];
}

export interface Rest {
  at: number;
  durationMs: number;
  lat: number;
  lng: number;
}

export interface Weather {
  tempF: number;
  code: string;
  sunset: string;
}

export interface Privacy {
  trimStartM: number;
  trimEndM: number;
}

export interface Movement {
  schema: number;
  id: string;
  number: number;
  startedAt: string;
  endedAt: string;
  tz: string;
  synthetic: boolean;
  path: PathPoint[];
  polls: Poll[];
  tracks: Record<string, Track>;
  phrases: Phrase[];
  rests: Rest[];
  photos: unknown[];
  weather: Weather;
  privacy: Privacy;
}
