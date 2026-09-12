const ROMAN_NUMERAL_TABLE: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Converts a positive integer into classical (subtractive) Roman numerals. */
export function toRomanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`toRomanNumeral: expected a positive integer, got ${value}`);
  }

  let remaining = value;
  let result = '';
  for (const [amount, numeral] of ROMAN_NUMERAL_TABLE) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}
