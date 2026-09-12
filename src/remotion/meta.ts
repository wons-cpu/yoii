import type {Movement} from '../movement/types';

/** e.g. "Sep 5" — in the movement's own recorded timezone, not the render machine's. */
export function formatDate(movement: Movement): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: movement.tz,
  }).format(new Date(movement.startedAt));
}

/** e.g. "54°F" */
export function formatTemperature(movement: Movement): string {
  return `${movement.weather.tempF}°F`;
}

/** e.g. "37 min" — from the recorded start/end timestamps, rounded to the nearest minute. */
export function formatDuration(movement: Movement): string {
  const startedAtMs = new Date(movement.startedAt).getTime();
  const endedAtMs = new Date(movement.endedAt).getTime();
  const minutes = Math.round((endedAtMs - startedAtMs) / 60_000);
  return `${minutes} min`;
}

/**
 * The final frame's one meta line: date, city, temperature, duration.
 * `city` isn't in the movement JSON yet (CLAUDE.md's data contract has no
 * location field) — callers pass in a placeholder until week 2's
 * recording flow adds it.
 */
export function buildMetaLine(movement: Movement, city: string): string {
  return [formatDate(movement), city, formatTemperature(movement), formatDuration(movement)].join(
    '   ·   ',
  );
}
