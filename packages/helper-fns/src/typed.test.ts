import { describe, expect, test } from 'vitest';

import {
  isSymbol,
  isArray,
  isObject,
  isPrimitive,
  isFunction,
  isString,
  isInt,
  isFloat,
  isNumber,
  isDate,
  isEmpty,
  isEqual,
} from './typed';

describe('typed module', () => {
  describe('isSymbol', () => {
    test('returns true for symbols', () => {
      expect(isSymbol(Symbol('x'))).toBe(true);
    });

    test('returns false for non-symbols', () => {
      expect(isSymbol('x')).toBe(false);
      expect(isSymbol(1)).toBe(false);
      expect(isSymbol(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    test('returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2])).toBe(true);
    });

    test('returns false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('hello')).toBe(false);
    });
  });

  describe('isObject', () => {
    test('returns true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    test('returns false for arrays, null, and primitives', () => {
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(42)).toBe(false);
    });
  });

  describe('isPrimitive', () => {
    test('returns true for primitives', () => {
      expect(isPrimitive(null)).toBe(true);
      expect(isPrimitive(undefined)).toBe(true);
      expect(isPrimitive(42)).toBe(true);
      expect(isPrimitive('hello')).toBe(true);
      expect(isPrimitive(true)).toBe(true);
    });

    test('returns false for objects and functions', () => {
      expect(isPrimitive({})).toBe(false);
      expect(isPrimitive([])).toBe(false);
      expect(isPrimitive(() => {})).toBe(false);
    });
  });

  describe('isFunction', () => {
    test('returns true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
    });

    test('returns false for non-functions', () => {
      expect(isFunction(42)).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isString', () => {
    test('returns true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString(String('hello'))).toBe(true);
    });

    test('returns false for non-strings', () => {
      expect(isString(42)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe('isInt', () => {
    test('returns true for integers', () => {
      expect(isInt(42)).toBe(true);
      expect(isInt(0)).toBe(true);
    });

    test('returns false for floats', () => {
      expect(isFloat(42)).toBe(false);
    });
  });

  describe('isFloat', () => {
    test('returns true for floats', () => {
      expect(isFloat(3.14)).toBe(true);
    });

    test('returns false for integers', () => {
      expect(isFloat(42)).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('returns true for numbers', () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(0)).toBe(true);
    });

    test('returns false for non-numbers', () => {
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(NaN)).toBe(false);
    });
  });

  describe('isDate', () => {
    test('returns true for Date objects', () => {
      expect(isDate(new Date())).toBe(true);
    });

    test('returns false for non-dates', () => {
      expect(isDate('2024-01-01')).toBe(false);
      expect(isDate(1234567890)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('returns true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    test('returns true for booleans', () => {
      expect(isEmpty(true)).toBe(true);
      expect(isEmpty(false)).toBe(true);
    });

    test('returns true for zero', () => {
      expect(isEmpty(0)).toBe(true);
    });

    test('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    test('returns false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    test('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    test('returns false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    test('returns true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    test('returns false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false);
    });
  });

  describe('isEqual', () => {
    test('returns true for identical primitives', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual('a', 'a')).toBe(true);
    });

    test('returns false for different primitives', () => {
      expect(isEqual(1, 2)).toBe(false);
    });

    test('returns true for equal dates', () => {
      const d = new Date('2024-01-01');
      expect(isEqual(d, new Date('2024-01-01'))).toBe(true);
    });

    test('returns false for different dates', () => {
      expect(isEqual(new Date('2024-01-01'), new Date('2024-01-02'))).toBe(false);
    });

    test('returns true for equal regex', () => {
      expect(isEqual(/abc/g, /abc/g)).toBe(true);
    });

    test('returns true for deeply equal objects', () => {
      expect(isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
    });

    test('returns false for different objects', () => {
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('returns false when key count differs', () => {
      expect(isEqual({ a: 1 }, { a: 1, b: 2 } as any)).toBe(false);
    });
  });
});
