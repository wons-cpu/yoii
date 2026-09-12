import {describe, expect, it} from 'vitest';
import {brighterOf} from './colors';

describe('brighterOf', () => {
  it('picks whichever color is lighter, regardless of order', () => {
    expect(brighterOf(['#FFFFFF', '#000000'])).toBe('#FFFFFF');
    expect(brighterOf(['#000000', '#FFFFFF'])).toBe('#FFFFFF');
  });

  it('weighs green more heavily than red or blue, per perceived luma', () => {
    expect(brighterOf(['#00FF00', '#FF0000'])).toBe('#00FF00');
  });

  it('picks the vivid color over the near-black shadow tone in real track pairs', () => {
    // Nightcall: colors[0] is the vivid red, colors[1] a near-black maroon.
    expect(brighterOf(['#D8342B', '#4A1210'])).toBe('#D8342B');
  });
});
