/**
 * Checks if the given number is between zero (0) and the ending number. 0 is inclusive.
 *
 * * Numbers can be negative or positive.
 * * Ending number is exclusive.
 *
 * @param {number} number The number to check.
 * @param {number} end The end of the range. Exclusive.
 * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
 */
export function inRange(number: number, end: number): boolean;

/**
 * Checks if the given number is between two numbers.
 *
 * * Numbers can be negative or positive.
 * * Starting number is inclusive.
 * * Ending number is exclusive.
 * * The start and the end of the range can be ascending OR descending order.
 *
 * @param {number} number The number to check.
 * @param {number} start The start of the range. Inclusive.
 * @param {number} end The end of the range. Exclusive.
 * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
 */
export function inRange(number: number, start: number, end: number): boolean;
export function inRange(number: number, start: number, end?: number): boolean {
  let startNum = start;
  let endNum = end;

  const isTypeSafe =
    typeof number === 'number' &&
    typeof startNum === 'number' &&
    (typeof endNum === 'undefined' || typeof endNum === 'number');

  if (!isTypeSafe) {
    return false;
  }

  if (typeof endNum === 'undefined') {
    endNum = startNum;
    startNum = 0;
  }

  return number >= Math.min(startNum, endNum) && number < Math.max(startNum, endNum);
}

export const toFloat = <T extends number | null = number>(value: any, defaultValue?: T): number | T => {
  const def = defaultValue === undefined ? 0.0 : defaultValue;

  if (value === null || value === undefined) {
    return def;
  }

  const result = Number.parseFloat(value);

  return Number.isNaN(result) ? def : result;
};

export const toInt = <T extends number | null = number>(value: any, defaultValue?: T): number | T => {
  const def = defaultValue === undefined ? 0 : defaultValue;

  if (value === null || value === undefined) {
    return def;
  }

  const result = Number.parseInt(value);

  return Number.isNaN(result) ? def : result;
};
