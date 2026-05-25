import { describe, expect, test } from 'vitest';

import { inRange, toFloat, toInt } from './number';

describe('number module', () => {
  describe('inRange function', () => {
    test('returns true when number is in range (two args)', () => {
      expect(inRange(2, 5)).toBe(true);
    });

    test('returns false when number is out of range (two args)', () => {
      expect(inRange(5, 3)).toBe(false);
    });

    test('returns true for zero in positive range', () => {
      expect(inRange(0, 5)).toBe(true);
    });

    test('end is exclusive (two args)', () => {
      expect(inRange(5, 5)).toBe(false);
    });

    test('returns true when number is in range (three args)', () => {
      expect(inRange(3, 1, 5)).toBe(true);
    });

    test('start is inclusive (three args)', () => {
      expect(inRange(1, 1, 5)).toBe(true);
    });

    test('end is exclusive (three args)', () => {
      expect(inRange(5, 1, 5)).toBe(false);
    });

    test('handles descending range', () => {
      expect(inRange(3, 5, 1)).toBe(true);
    });

    test('handles negative numbers', () => {
      expect(inRange(-3, -5, -1)).toBe(true);
    });

    test('returns false for non-number input', () => {
      expect(inRange('a' as any, 5)).toBe(false);
    });
  });

  describe('toFloat function', () => {
    test('parses valid float string', () => {
      expect(toFloat('3.14')).toBe(3.14);
    });

    test('returns default for null', () => {
      expect(toFloat(null)).toBe(0.0);
    });

    test('returns default for undefined', () => {
      expect(toFloat(undefined)).toBe(0.0);
    });

    test('returns custom default for invalid value', () => {
      expect(toFloat('abc', 5.5)).toBe(5.5);
    });

    test('returns null default when specified', () => {
      expect(toFloat('abc', null)).toBeNull();
    });
  });

  describe('toInt function', () => {
    test('parses valid integer string', () => {
      expect(toInt('42')).toBe(42);
    });

    test('returns default for null', () => {
      expect(toInt(null)).toBe(0);
    });

    test('returns default for undefined', () => {
      expect(toInt(undefined)).toBe(0);
    });

    test('returns custom default for invalid value', () => {
      expect(toInt('abc', 10)).toBe(10);
    });

    test('truncates float strings to integer', () => {
      expect(toInt('3.14')).toBe(3);
    });
  });
});
