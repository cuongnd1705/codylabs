import { describe, expect, test } from 'vitest';

import { intersects, diff } from './array';

describe('array module', () => {
  describe('intersects function', () => {
    test('returns true when arrays share elements', () => {
      expect(intersects([1, 2, 3], [2, 4])).toBe(true);
    });

    test('returns false when arrays do not share elements', () => {
      expect(intersects([1, 2, 3], [4, 5, 6])).toBe(false);
    });

    test('returns false for empty arrays', () => {
      expect(intersects([], [])).toBe(false);
    });

    test('returns false when first array is null', () => {
      expect(intersects(null as any, [1, 2])).toBe(false);
    });

    test('returns false when second array is null', () => {
      expect(intersects([1, 2], null as any)).toBe(false);
    });

    test('works with custom identity function', () => {
      const a = [{ id: 1 }, { id: 2 }];
      const b = [{ id: 2 }, { id: 3 }];
      expect(intersects(a, b, (x) => x.id)).toBe(true);
    });

    test('returns false with custom identity when no intersection', () => {
      const a = [{ id: 1 }];
      const b = [{ id: 2 }];
      expect(intersects(a, b, (x) => x.id)).toBe(false);
    });
  });

  describe('diff function', () => {
    test('returns items in first array not in second', () => {
      expect(diff([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
    });

    test('returns empty array when both are empty', () => {
      expect(diff([], [])).toEqual([]);
    });

    test('returns copy of first array when second is empty', () => {
      expect(diff([1, 2, 3], [])).toEqual([1, 2, 3]);
    });

    test('returns copy of second array when first has no length', () => {
      expect(diff(null as any, [1, 2])).toEqual([1, 2]);
    });

    test('returns empty array when all items are in second', () => {
      expect(diff([1, 2], [1, 2, 3])).toEqual([]);
    });

    test('works with custom identity function', () => {
      const a = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const b = [{ id: 2 }];
      const result = diff(a, b, (x) => x.id);
      expect(result).toEqual([{ id: 1 }, { id: 3 }]);
    });
  });
});
