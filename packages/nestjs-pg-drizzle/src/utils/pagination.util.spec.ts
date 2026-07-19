import { BadRequestException } from '@nestjs/common';

import {
  appendStableTiebreaker,
  decodeCursor,
  encodeCursor,
  parseOrderByString,
  validatePagination,
} from './pagination.util';

describe('repository pagination utilities', () => {
  it('round-trips URL-safe cursor values without losing bigint and date types', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const token = encodeCursor({ id: 42n, createdAt });
    const cursor = decodeCursor(token, [
      { key: 'createdAt', direction: 'desc' },
      { key: 'id', direction: 'asc' },
    ]);

    expect(token).not.toMatch(/[+/=]/);
    expect(cursor).toEqual({ id: 42n, createdAt });
  });

  it('accepts legacy root-value cursors', () => {
    const token = Buffer.from(JSON.stringify({ id: 10 })).toString('base64');
    expect(decodeCursor(token, [{ key: 'id', direction: 'asc' }])).toEqual({ id: 10 });
  });

  it('adds a stable id tiebreaker when the table supports one', () => {
    expect(appendStableTiebreaker([{ key: 'createdAt', direction: 'desc' }], new Set(['createdAt', 'id']))).toEqual([
      { key: 'createdAt', direction: 'desc' },
      { key: 'id', direction: 'desc' },
    ]);
  });

  it('rejects malformed pagination input', () => {
    expect(() => parseOrderByString('id:sideways')).toThrow(BadRequestException);
    expect(() => validatePagination(0, 10)).toThrow(BadRequestException);
    expect(() => validatePagination(1, 1001)).toThrow(BadRequestException);
    expect(() => decodeCursor(encodeCursor({ id: 1 }), [{ key: 'createdAt', direction: 'asc' }])).toThrow(
      BadRequestException,
    );
  });
});
