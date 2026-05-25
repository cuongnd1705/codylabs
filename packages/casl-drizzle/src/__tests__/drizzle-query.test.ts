import { describe, it, expect } from 'vitest';

import { drizzleQuery } from '../drizzle/drizzleQuery';

describe('drizzleQuery evaluation', () => {
  // ─── equals (default operator) ───────────────────────────────────────────
  describe('equals', () => {
    it('uses "equals" as default operator', () => {
      const test = drizzleQuery({ id: 1 });
      expect(test({ id: 1 })).toBe(true);
      expect(test({ id: 2 })).toBe(false);
    });

    it('throws when comparing with object or array', () => {
      expect(() => drizzleQuery({ items: {} })).toThrow(/does not support comparison/);
      expect(() => drizzleQuery({ items: [] })).toThrow(/does not support comparison/);
    });

    it('can compare Dates', () => {
      const now = new Date();
      const test = drizzleQuery({ createdAt: now });
      expect(test({ createdAt: new Date(now.toISOString()) })).toBe(true);
      expect(test({ createdAt: new Date(0) })).toBe(false);
    });

    it('can compare null', () => {
      const test = drizzleQuery({ value: null });
      expect(test({ value: null })).toBe(true);
      expect(test({ value: 1 })).toBe(false);
    });

    it('uses explicit equals operator', () => {
      const test = drizzleQuery({ id: { eq: 1 } });
      expect(test({ id: 1 })).toBe(true);
      expect(test({ id: 2 })).toBe(false);
    });
  });

  // ─── ne ──────────────────────────────────────────────────────────────────
  describe('ne', () => {
    it('checks that value is not equal', () => {
      const test = drizzleQuery({ age: { ne: 10 } });
      expect(test({ age: 10 })).toBe(false);
      expect(test({ age: 11 })).toBe(true);
    });
  });

  // ─── gt, gte, lt, lte ───────────────────────────────────────────────────
  describe('gt', () => {
    it('checks greater than', () => {
      const test = drizzleQuery({ age: { gt: 18 } });
      expect(test({ age: 17 })).toBe(false);
      expect(test({ age: 18 })).toBe(false);
      expect(test({ age: 19 })).toBe(true);
    });

    it('throws for non-comparable values', () => {
      expect(() => drizzleQuery({ age: { gt: {} as any } })).toThrow(/comparable value/);
    });
  });

  describe('gte', () => {
    it('checks greater than or equal', () => {
      const test = drizzleQuery({ age: { gte: 18 } });
      expect(test({ age: 17 })).toBe(false);
      expect(test({ age: 18 })).toBe(true);
      expect(test({ age: 19 })).toBe(true);
    });
  });

  describe('lt', () => {
    it('checks less than', () => {
      const test = drizzleQuery({ age: { lt: 18 } });
      expect(test({ age: 17 })).toBe(true);
      expect(test({ age: 18 })).toBe(false);
      expect(test({ age: 19 })).toBe(false);
    });
  });

  describe('lte', () => {
    it('checks less than or equal', () => {
      const test = drizzleQuery({ age: { lte: 18 } });
      expect(test({ age: 17 })).toBe(true);
      expect(test({ age: 18 })).toBe(true);
      expect(test({ age: 19 })).toBe(false);
    });
  });

  // ─── in, notIn ──────────────────────────────────────────────────────────
  describe('in', () => {
    it('checks value is in array', () => {
      const test = drizzleQuery({ id: { in: [1, 2, 3] } });
      expect(test({ id: 1 })).toBe(true);
      expect(test({ id: 2 })).toBe(true);
      expect(test({ id: 4 })).toBe(false);
    });

    it('throws if value is not an array', () => {
      expect(() => drizzleQuery({ id: { in: {} as any } })).toThrow(/an array/);
    });
  });

  describe('notIn', () => {
    it('checks value is NOT in array', () => {
      const test = drizzleQuery({ id: { notIn: [1, 2] } });
      expect(test({ id: 1 })).toBe(false);
      expect(test({ id: 2 })).toBe(false);
      expect(test({ id: 3 })).toBe(true);
    });
  });

  // ─── like, ilike, notLike, notIlike ──────────────────────────────────────
  describe('like', () => {
    it('checks SQL LIKE pattern (case-sensitive)', () => {
      const test = drizzleQuery({ name: { like: '%Doe' } });
      expect(test({ name: 'John Doe' })).toBe(true);
      expect(test({ name: 'john doe' })).toBe(false);
      expect(test({ name: 'Jane Smith' })).toBe(false);
    });

    it('supports % wildcard in the middle', () => {
      const test = drizzleQuery({ name: { like: 'J%e' } });
      expect(test({ name: 'Jane' })).toBe(true);
      expect(test({ name: 'Joe' })).toBe(true);
      expect(test({ name: 'John' })).toBe(false);
    });

    it('supports _ single char wildcard', () => {
      const test = drizzleQuery({ code: { like: 'A_C' } });
      expect(test({ code: 'ABC' })).toBe(true);
      expect(test({ code: 'AXC' })).toBe(true);
      expect(test({ code: 'ABBC' })).toBe(false);
    });

    it('throws for non-string values', () => {
      expect(() => drizzleQuery({ name: { like: 123 as any } })).toThrow(/string/);
    });
  });

  describe('ilike', () => {
    it('checks SQL LIKE pattern (case-insensitive)', () => {
      const test = drizzleQuery({ name: { ilike: '%doe' } });
      expect(test({ name: 'John Doe' })).toBe(true);
      expect(test({ name: 'john doe' })).toBe(true);
      expect(test({ name: 'Jane Smith' })).toBe(false);
    });
  });

  describe('notLike', () => {
    it('checks value does NOT match LIKE pattern', () => {
      const test = drizzleQuery({ name: { notLike: '%Doe' } });
      expect(test({ name: 'John Doe' })).toBe(false);
      expect(test({ name: 'Jane Smith' })).toBe(true);
    });
  });

  describe('notIlike', () => {
    it('checks value does NOT match ILIKE pattern', () => {
      const test = drizzleQuery({ name: { notIlike: '%doe' } });
      expect(test({ name: 'John Doe' })).toBe(false);
      expect(test({ name: 'Jane Smith' })).toBe(true);
    });
  });

  // ─── isNull, isNotNull ──────────────────────────────────────────────────
  describe('isNull', () => {
    it('checks value is null or undefined when true', () => {
      const test = drizzleQuery({ deletedAt: { isNull: true } });
      expect(test({ deletedAt: null })).toBe(true);
      expect(test({ deletedAt: undefined })).toBe(true);
      expect(test({})).toBe(true);
      expect(test({ deletedAt: new Date() })).toBe(false);
    });

    it('throws for non-boolean', () => {
      expect(() => drizzleQuery({ deletedAt: { isNull: 'yes' as any } })).toThrow(/a boolean/);
    });
  });

  describe('isNotNull', () => {
    it('checks value is not null when true', () => {
      const test = drizzleQuery({ name: { isNotNull: true } });
      expect(test({ name: 'John' })).toBe(true);
      expect(test({ name: null })).toBe(false);
      expect(test({ name: undefined })).toBe(false);
    });
  });

  // ─── arrayContains, arrayContained, arrayOverlaps ───────────────────────
  describe('arrayContains', () => {
    it('checks array contains all specified values', () => {
      const test = drizzleQuery({ tags: { arrayContains: ['a', 'b'] } });
      expect(test({ tags: ['a', 'b', 'c'] })).toBe(true);
      expect(test({ tags: ['a'] })).toBe(false);
      expect(test({ tags: ['b', 'a'] })).toBe(true);
    });

    it('throws for non-array', () => {
      expect(() => drizzleQuery({ tags: { arrayContains: 'a' as any } })).toThrow(/an array/);
    });
  });

  describe('arrayContained', () => {
    it('checks array is contained by specified values', () => {
      const test = drizzleQuery({
        tags: { arrayContained: ['a', 'b', 'c'] },
      });
      expect(test({ tags: ['a', 'b'] })).toBe(true);
      expect(test({ tags: ['a', 'b', 'c'] })).toBe(true);
      expect(test({ tags: ['a', 'd'] })).toBe(false);
    });
  });

  describe('arrayOverlaps', () => {
    it('checks arrays have at least one common element', () => {
      const test = drizzleQuery({ tags: { arrayOverlaps: ['a', 'x'] } });
      expect(test({ tags: ['a', 'b'] })).toBe(true);
      expect(test({ tags: ['x', 'y'] })).toBe(true);
      expect(test({ tags: ['b', 'c'] })).toBe(false);
    });
  });

  // ─── AND, OR, NOT (table-level) ─────────────────────────────────────────
  describe('AND', () => {
    it('combines conditions with logical AND (array)', () => {
      const test = drizzleQuery({
        AND: [{ age: { gte: 18 } }, { active: true }],
      });
      expect(test({ age: 18, active: true })).toBe(true);
      expect(test({ age: 17, active: true })).toBe(false);
      expect(test({ age: 18, active: false })).toBe(false);
    });

    it('combines conditions with logical AND (object)', () => {
      const test = drizzleQuery({
        AND: { age: { gte: 18 }, active: true },
      });
      expect(test({ age: 18, active: true })).toBe(true);
      expect(test({ age: 17, active: true })).toBe(false);
    });
  });

  describe('OR', () => {
    it('combines conditions with logical OR', () => {
      const test = drizzleQuery({
        OR: [{ status: 'published' }, { status: 'draft' }],
      });
      expect(test({ status: 'published' })).toBe(true);
      expect(test({ status: 'draft' })).toBe(true);
      expect(test({ status: 'archived' })).toBe(false);
    });
  });

  describe('NOT', () => {
    it('negates a condition', () => {
      const test = drizzleQuery({
        NOT: { status: 'archived' },
      });
      expect(test({ status: 'published' })).toBe(true);
      expect(test({ status: 'archived' })).toBe(false);
    });
  });

  // ─── Complex queries ────────────────────────────────────────────────────
  describe('complex queries', () => {
    it('combines multiple field conditions (implicit AND)', () => {
      const test = drizzleQuery({ age: { gte: 18 }, active: true });
      expect(test({ age: 20, active: true })).toBe(true);
      expect(test({ age: 15, active: true })).toBe(false);
      expect(test({ age: 20, active: false })).toBe(false);
    });

    it('handles nested AND/OR/NOT', () => {
      const test = drizzleQuery({
        OR: [{ AND: [{ role: 'admin' }, { active: true }] }, { AND: [{ role: 'editor' }, { verified: true }] }],
      });
      expect(test({ role: 'admin', active: true, verified: false })).toBe(true);
      expect(test({ role: 'editor', active: false, verified: true })).toBe(true);
      expect(test({ role: 'viewer', active: true, verified: true })).toBe(false);
    });
  });
});
