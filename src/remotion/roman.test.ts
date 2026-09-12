import {describe, expect, it} from 'vitest';
import {toRomanNumeral} from './roman';

describe('toRomanNumeral', () => {
  it('handles simple values', () => {
    expect(toRomanNumeral(1)).toBe('I');
    expect(toRomanNumeral(3)).toBe('III');
  });

  it('handles subtractive notation', () => {
    expect(toRomanNumeral(4)).toBe('IV');
    expect(toRomanNumeral(9)).toBe('IX');
    expect(toRomanNumeral(40)).toBe('XL');
    expect(toRomanNumeral(90)).toBe('XC');
  });

  it('handles the fixture movement number', () => {
    expect(toRomanNumeral(23)).toBe('XXIII');
  });

  it('handles larger, compound values', () => {
    expect(toRomanNumeral(444)).toBe('CDXLIV');
    expect(toRomanNumeral(1994)).toBe('MCMXCIV');
    expect(toRomanNumeral(3999)).toBe('MMMCMXCIX');
  });

  it('rejects zero, negative, and non-integer values', () => {
    expect(() => toRomanNumeral(0)).toThrow(RangeError);
    expect(() => toRomanNumeral(-5)).toThrow(RangeError);
    expect(() => toRomanNumeral(1.5)).toThrow(RangeError);
  });
});
