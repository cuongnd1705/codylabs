import { BadRequestException } from '@nestjs/common';

import type { OrderByField } from '../interfaces';

const CURSOR_VERSION = 1;
const MAX_PAGE_SIZE = 1000;

interface CursorPayload {
  version: typeof CURSOR_VERSION;
  values: Record<string, unknown>;
}

export function validatePagination(page: number, pageSize: number): void {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new BadRequestException('Page must be a positive integer');
  }

  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new BadRequestException(`Page size must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
}

export function parseOrderByString(orderBy: string): OrderByField[] {
  const parts = orderBy.split(',');

  if (parts.length === 0) {
    throw new BadRequestException('At least one order field is required');
  }

  return parts.map((part) => {
    const [rawKey, rawDirection, ...extra] = part.split(':');
    const key = rawKey?.trim();
    const direction = rawDirection?.trim().toLowerCase() || 'asc';

    if (!key || extra.length > 0) {
      throw new BadRequestException(`Invalid order expression '${part}'`);
    }

    if (direction !== 'asc' && direction !== 'desc') {
      throw new BadRequestException(`Invalid order direction '${direction}' for field '${key}'`);
    }

    return {
      key,
      direction,
    };
  });
}

export function validateOrderByFields(
  orderBy: OrderByField[],
  validColumns: ReadonlySet<string>,
  tableName: string,
): OrderByField[] {
  for (const { key } of orderBy) {
    if (!validColumns.has(key)) {
      throw new BadRequestException(`Invalid order field '${key}' for table '${tableName}'`);
    }
  }

  return orderBy;
}

export function appendStableTiebreaker(
  orderBy: OrderByField[],
  validColumns: ReadonlySet<string>,
  key = 'id',
): OrderByField[] {
  if (!validColumns.has(key) || orderBy.some((field) => field.key === key)) {
    return orderBy;
  }

  return [...orderBy, { key, direction: orderBy.at(-1)?.direction ?? 'asc' }];
}

export function buildCursorConditions(
  orderBy: OrderByField[],
  cursor: Record<string, unknown>,
): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];

  for (let i = 0; i < orderBy.length; i++) {
    const current = orderBy[i]!;
    const equals: Record<string, unknown> = {};

    for (let j = 0; j < i; j++) {
      const previous = orderBy[j]!;
      equals[previous.key] = cursor[previous.key];
    }

    conditions.push({
      AND: [
        equals,
        {
          [current.key]: {
            [current.direction === 'asc' ? 'gt' : 'lt']: cursor[current.key],
          },
        },
      ],
    });
  }

  return {
    OR: conditions,
  };
}

export function encodeCursor(values: Record<string, unknown>): string {
  const encodedValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (typeof value === 'bigint') {
        return [key, { type: 'bigint', value: value.toString() }];
      }

      if (value instanceof Date) {
        return [key, { type: 'date', value: value.toISOString() }];
      }

      return [key, value];
    }),
  );

  const payload: CursorPayload = {
    version: CURSOR_VERSION,
    values: encodedValues,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(token: string, orderBy: OrderByField[]): Record<string, unknown> {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));

    if (!isRecord(decoded)) {
      throw new Error('Cursor must be an object');
    }

    // Tokens produced before cursor versioning stored the values at the root.
    const values = decoded['version'] === CURSOR_VERSION && isRecord(decoded['values']) ? decoded['values'] : decoded;
    const cursor = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, decodeCursorValue(value)]));

    for (const { key } of orderBy) {
      if (!Object.hasOwn(cursor, key) || cursor[key] === undefined) {
        throw new Error(`Cursor is missing order field '${key}'`);
      }
    }

    return cursor;
  } catch (error: unknown) {
    throw new BadRequestException('Invalid page token', { cause: error });
  }
}

function decodeCursorValue(value: unknown): unknown {
  if (!isRecord(value) || typeof value['type'] !== 'string' || typeof value['value'] !== 'string') {
    return value;
  }

  if (value['type'] === 'bigint') {
    return BigInt(value['value']);
  }

  if (value['type'] === 'date') {
    const date = new Date(value['value']);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Cursor contains an invalid date');
    }

    return date;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
