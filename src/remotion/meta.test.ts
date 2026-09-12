import {describe, expect, it} from 'vitest';
import type {Movement} from '../movement/types';
import {buildMetaLine, formatDate, formatDuration, formatTemperature} from './meta';

const baseMovement: Movement = {
  schema: 1,
  id: 'mv_test',
  number: 1,
  startedAt: '2026-09-05T21:14:03Z',
  endedAt: '2026-09-05T21:51:18Z',
  tz: 'America/New_York',
  synthetic: true,
  path: [],
  polls: [],
  tracks: {},
  phrases: [],
  rests: [],
  photos: [],
  weather: {tempF: 54, code: 'clear', sunset: '20:02'},
  privacy: {trimStartM: 0, trimEndM: 0},
};

describe('formatDate', () => {
  it('formats in the movement\'s own recorded timezone', () => {
    // 21:14 UTC on Sep 5 is 17:14 in America/New_York — still Sep 5.
    expect(formatDate(baseMovement)).toBe('Sep 5');
  });

  it('can shift the calendar day when the timezone crosses midnight', () => {
    // 21:14 UTC is 06:14 the next morning in Asia/Tokyo (UTC+9).
    expect(formatDate({...baseMovement, tz: 'Asia/Tokyo'})).toBe('Sep 6');
  });
});

describe('formatTemperature', () => {
  it('appends the unit', () => {
    expect(formatTemperature(baseMovement)).toBe('54°F');
  });
});

describe('formatDuration', () => {
  it('rounds the recorded start/end span to the nearest minute', () => {
    // 21:14:03 -> 21:51:18 is 37m15s, rounds to 37.
    expect(formatDuration(baseMovement)).toBe('37 min');
  });

  it('rounds up when the remainder is at least 30 seconds', () => {
    const movement = {...baseMovement, endedAt: '2026-09-05T21:51:33Z'}; // 37m30s
    expect(formatDuration(movement)).toBe('38 min');
  });
});

describe('buildMetaLine', () => {
  it('joins date, city, temperature, and duration in order', () => {
    expect(buildMetaLine(baseMovement, 'Atlanta')).toBe('Sep 5   ·   Atlanta   ·   54°F   ·   37 min');
  });
});
