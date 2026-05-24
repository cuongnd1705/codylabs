import type { PgTable } from 'drizzle-orm/pg-core';

import {
  BuildQueryResult,
  type AnyColumn,
  type AnyTable,
  type DBQueryConfig,
  type DrizzleTypeError,
  type Equal,
  type GetColumnData,
  type InferSelectModel,
  type KnownKeysOnly,
  type SQL,
  type TablesRelationalConfig,
} from 'drizzle-orm';
import { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';

export type Database<TSchema extends TablesRelationalConfig = TablesRelationalConfig> = NodePgDatabase<TSchema>;

export type Transaction<TRelations extends TablesRelationalConfig = TablesRelationalConfig> =
  NodePgTransaction<TRelations>;

export type IncludeRelation<TRel extends TablesRelationalConfig, V extends keyof TRel> =
  DBQueryConfig<'one' | 'many', TRel, TRel[V]> extends { with?: infer W } ? W : never;

export type InferRelationsResult<
  TRel extends TablesRelationalConfig,
  V extends keyof TRel,
  With extends IncludeRelation<TRel, V> | undefined = undefined,
> = BuildQueryResult<
  TRel,
  TRel[V],
  {
    with: With;
  }
>;

export type OrderByField = {
  key: string;
  direction: 'asc' | 'desc';
};

/**
 * The options for finding the first record.
 */
export type FindFirstOpts<T extends Record<string, unknown>> = KnownKeysOnly<
  T,
  FindFirstQueryConfig<TablesRelationalConfig, keyof TablesRelationalConfig>
>;

/**
 * The options for finding many records.
 */
export type FindManyOpts<T extends Record<string, unknown>> = KnownKeysOnly<
  T,
  FindManyQueryConfig<TablesRelationalConfig, keyof TablesRelationalConfig>
>;

/**
 * The options for paginating the records by offset.
 */
export type PaginateByOffsetOpts<T extends Record<string, unknown>> = KnownKeysOnly<
  T,
  PaginateByOffsetQueryConfig<TablesRelationalConfig, keyof TablesRelationalConfig>
>;

/**
 * The find first query builder config.
 */
export type FindFirstQueryConfig<TRel extends TablesRelationalConfig, V extends keyof TRel> = Omit<
  DBQueryConfig<'many', TRel, TRel[V]>,
  'limit'
> & {
  /** When true, include soft-deleted rows (rows where deleteTime IS NOT NULL). Defaults to false. */
  showDeleted?: boolean;
  tx?: Transaction;
};

/**
 * The find many query builder config.
 */
export type FindManyQueryConfig<TRel extends TablesRelationalConfig, V extends keyof TRel> = DBQueryConfig<
  'many',
  TRel,
  TRel[V]
> & {
  /** When true, include soft-deleted rows (rows where deleteTime IS NOT NULL). Defaults to false. */
  showDeleted?: boolean;
  tx?: Transaction;
};

/**
 * The paginate by offset query builder config.
 */
export type PaginateByOffsetQueryConfig<TRel extends TablesRelationalConfig, V extends keyof TRel> = Omit<
  DBQueryConfig<'many', TRel, TRel[V]> & {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    showDeleted?: boolean;
    tx?: Transaction;
  },
  'limit' | 'offset'
>;

/**
 * The paginate by cursor query builder config.
 *
 * `sortBy` accepts either:
 *   - A `string` (single field, uses `sortDirection` for direction)
 *   - An `Array<CursorSortField>` (multiple fields, per-field direction; `sortDirection` is ignored)
 *
 * `id` is always appended as the final tiebreaker unless it is already the last field.
 */
export type PaginateByCursorQueryConfig<TRel extends TablesRelationalConfig, V extends keyof TRel> = Omit<
  DBQueryConfig<'many', TRel, TRel[V]> & {
    pageSize?: number;
    pageToken?: string | null;
    orderBy?: string;
    showDeleted?: boolean;
    tx?: Transaction;
  },
  'limit' | 'offset' | 'orderBy'
>;

/**
 * The options for paginating the records by cursor.
 */
export type PaginateByCursorOpts<T extends Record<string, unknown>> = KnownKeysOnly<
  T,
  PaginateByCursorQueryConfig<TablesRelationalConfig, keyof TablesRelationalConfig>
>;

export type SimplifyShallow<T> = {
  [K in keyof T]: T[K];
} & {};

export type SelectResultField<T, TDeep extends boolean = true> =
  T extends DrizzleTypeError<any>
    ? T
    : T extends AnyTable<any>
      ? Equal<TDeep, true> extends true
        ? SelectResultField<T['_']['columns'], false>
        : never
      : T extends AnyColumn
        ? GetColumnData<T>
        : T extends SQL | SQL.Aliased
          ? T['_']['type']
          : T extends Record<string, any>
            ? SelectResultFields<T, true>
            : never;

export type SelectResultFields<TSelectedFields, TDeep extends boolean = true> = SimplifyShallow<{
  [Key in keyof TSelectedFields & string]: SelectResultField<TSelectedFields[Key], TDeep>;
}>;

export type NumericKeys<U extends PgTable<any>> = {
  [K in keyof InferSelectModel<U>]: InferSelectModel<U>[K] extends number | bigint | null ? K : never;
}[keyof InferSelectModel<U>] &
  string;
