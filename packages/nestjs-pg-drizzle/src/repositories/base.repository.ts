import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type {
  IndexColumn,
  PgAsyncInsertBase,
  PgInsertOnConflictDoUpdateConfig,
  PgInsertValue,
  PgTable,
  PgUpdateSetSource,
  SelectedFieldsFlat,
} from 'drizzle-orm/pg-core';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BuildQueryResult,
  DBQueryConfig,
  type InferSelectModel,
  type SQL,
  type TablesRelationalConfig,
  getColumns,
  getTableName,
  operators,
  relationsFilterToSQL,
  sql,
} from 'drizzle-orm';

import {
  type Database,
  FindFirstOpts,
  FindFirstQueryConfig,
  FindManyOpts,
  FindManyQueryConfig,
  NumericKeys,
  PaginateByCursorOpts,
  PaginateByCursorQueryConfig,
  PaginateByOffsetOpts,
  PaginateByOffsetQueryConfig,
  SelectResultFields,
  Transaction,
} from '../interfaces';
import {
  appendStableTiebreaker,
  buildCursorConditions,
  camel,
  decodeCursor,
  encodeCursor,
  parseOrderByString,
  validateOrderByFields,
  validatePagination,
  withSoftDeleteFilter,
} from '../utils';

const objectKeys = <O extends object>(obj: O): (keyof O)[] => Object.keys(obj) as (keyof O)[];

@Injectable()
export abstract class BaseRepository<
  U extends PgTable<any>,
  TRel extends TablesRelationalConfig = TablesRelationalConfig,
  V extends keyof TRel = keyof TRel,
> {
  protected readonly db: Database<TRel>;
  protected readonly table: U;
  private tableName!: keyof TRel;

  constructor(db: Database<TRel>, table: U, tableName: V) {
    this.db = db;
    this.table = table;
    this.tableName = tableName;
  }

  get columns(): (keyof U['_']['columns'])[] {
    return objectKeys(getColumns(this.table));
  }

  get alias(): string {
    return camel(getTableName(this.table).replace('_private_', ''));
  }

  async withTransaction<T>(fn: (tx: Transaction<TRel>) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(tx as Transaction<TRel>));
  }

  private hasSoftDelete() {
    return this.columns.includes('deleteTime');
  }

  private hasUpdateTime() {
    return this.columns.includes('updateTime');
  }

  /**
   * Converts a relational filter object to a SQL condition, supporting cross-table
   * relation filters by passing the full relational config from the db instance.
   */
  private filterToSQL(
    filter: DBQueryConfig<'one' | 'many', TRel, TRel[V]>['where'],
  ): ReturnType<typeof relationsFilterToSQL> {
    const allRelations = this.db._.relations;
    const tableRelations = allRelations[this.tableName].relations ?? {};

    return relationsFilterToSQL(this.table, filter, tableRelations, allRelations);
  }

  /**
   * Resolves all supported Drizzle where forms behind one compatibility boundary.
   */
  private resolveWhere(where: FindManyQueryConfig<TRel, V>['where']): SQL<unknown> | undefined {
    if (!where) {
      return undefined;
    }

    if (typeof where === 'object' && 'queryChunks' in where) {
      return where as unknown as SQL<unknown>;
    }

    if (typeof where === 'function') {
      const callback = where as unknown as (columns: unknown, queryOperators: typeof operators) => SQL<unknown>;

      return callback(getColumns(this.table), operators);
    }

    return this.filterToSQL(where);
  }

  /**
   * A hook that is invoked right before a row is inserted.
   *
   * @param {PgInsertValue<U>} row
   * @returns {Promise<void>}
   */
  protected async beforeInsert(_row: PgInsertValue<U>): Promise<void> {}

  /**
   * A hook that is invoked after a row is inserted and right before returning to the caller.
   *
   * @param {InferSelectModel<U>} row
   * @returns {Promise<InferSelectModel<U>>}
   */
  // @ts-expect-error - allow returning modified row
  protected async afterInsert(_row: InferSelectModel<U>): Promise<InferSelectModel<U>> {}

  /**
   * A hook that is invoked after a row is deleted and right before returning to the caller.
   *
   * @param {InferSelectModel<U>} row
   * @returns {Promise<void>}
   */
  protected async afterDelete(_row: InferSelectModel<U>): Promise<void> {}

  /**
   * A hook that is invoked right before returning to the caller which applies to:
   *
   * - findFirst()
   * - findFirstOrFail()
   * - findMany()
   * - paginateByOffset() (via findMany)
   * - paginateByCursor() (via findMany)
   *
   * @param {InferSelectModel<U>} row
   * @returns {Promise<void>}
   */
  protected async afterFind(_row: InferSelectModel<U>): Promise<void> {}

  /**
   * A hook that is invoked right before a row is updated.
   *
   * @param {PgUpdateSetSource<U>} row
   * @returns {Promise<void>}
   */
  protected async beforeUpdate(_row: PgUpdateSetSource<U>): Promise<void> {}

  /**
   * A hook that is invoked after a row is updated and right before returning to the caller.
   *
   * @param {InferSelectModel<U>} row
   * @returns {Promise<void>}
   */
  protected async afterUpdate(_row: InferSelectModel<U>): Promise<void> {}

  /**
   * Insert 1 value into the database.
   *
   * @param {PgInsertValue<U>} value The values to insert.
   * @param {object} [opts] The insert options.
   * @param {object} [opts.columns] The fields to return.
   * @param {object} [opts.onConflictDoNothing] Optional conflict target to do nothing on conflict.
   * @param {object} [opts.onConflictDoUpdate] Optional conflict config to update on conflict. Automatically merges `updateTime: NOW()` when the table has an `updateTime` column.
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async insert<TSelectedFields extends SelectedFieldsFlat>(
    value: PgInsertValue<U>,
    opts: {
      columns: TSelectedFields;
      onConflictDoNothing?: {
        target?: IndexColumn | IndexColumn[];
      };
      onConflictDoUpdate?: PgInsertOnConflictDoUpdateConfig<
        PgAsyncInsertBase<U, NodePgQueryResultHKT, undefined, undefined, false, never>
      >;
      tx?: Transaction;
    },
  ): Promise<SelectResultFields<TSelectedFields> | null>;
  async insert(
    value: PgInsertValue<U>,
    opts?: {
      onConflictDoNothing?: {
        target?: IndexColumn | IndexColumn[];
      };
      onConflictDoUpdate?: PgInsertOnConflictDoUpdateConfig<
        PgAsyncInsertBase<U, NodePgQueryResultHKT, undefined, undefined, false, never>
      >;
      tx?: Transaction;
    },
  ): Promise<InferSelectModel<U> | null>;
  async insert<TSelectedFields extends SelectedFieldsFlat | undefined>(
    value: PgInsertValue<U>,
    opts?: {
      columns?: TSelectedFields;
      onConflictDoNothing?: {
        target?: IndexColumn | IndexColumn[];
      };
      onConflictDoUpdate?: PgInsertOnConflictDoUpdateConfig<
        PgAsyncInsertBase<U, NodePgQueryResultHKT, undefined, undefined, false, never>
      >;
      tx?: Transaction;
    },
  ) {
    await this.beforeInsert(value);

    let qb: any = (opts?.tx || this.db).insert(this.table).values(value);

    if (opts?.onConflictDoUpdate) {
      qb = qb.onConflictDoUpdate({
        ...opts.onConflictDoUpdate,
        ...(this.hasUpdateTime()
          ? {
              set: {
                ...opts.onConflictDoUpdate.set,
                updateTime: sql`NOW()`,
              },
            }
          : {}),
      });
    } else if (opts?.onConflictDoNothing) {
      qb = qb.onConflictDoNothing(opts.onConflictDoNothing);
    }

    const rows: any[] = await (opts && 'columns' in opts
      ? qb.returning(opts.columns as SelectedFieldsFlat)
      : qb.returning());

    if (rows.length < 1) {
      return null;
    }

    await this.afterInsert(rows[0]);

    return rows[0];
  }

  /**
   * Insert many values into the database.
   *
   * @param {PgInsertValue<U>[]} values The values to insert.
   * @param {object} [opts] The insert options.
   * @param {object} [opts.columns] The columns to return.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async insertMany<TSelectedFields extends SelectedFieldsFlat>(
    value: PgInsertValue<U>[],
    opts: {
      columns: TSelectedFields;
      tx?: Transaction;
    },
  ): Promise<SelectResultFields<TSelectedFields>[]>;
  async insertMany(value: PgInsertValue<U>[], opts?: { tx?: Transaction }): Promise<InferSelectModel<U>[]>;
  async insertMany<TSelectedFields extends SelectedFieldsFlat>(
    values: PgInsertValue<U>[],
    opts?: {
      columns?: TSelectedFields;
      tx?: Transaction;
    },
  ) {
    const qb: any = (opts?.tx || this.db).insert(this.table).values(
      await Promise.all(
        values.map(async (value) => {
          await this.beforeInsert(value);

          return value;
        }),
      ),
    );

    const rows: any[] = await (opts?.columns ? qb.returning(opts.columns) : qb.returning());

    if (rows.length < 1) {
      return [];
    }

    await Promise.all(rows.map(async (row) => this.afterInsert(row)));

    return rows;
  }

  /**
   * Delete the data rows in the database based on the where condition.
   *
   * @param {object} [opts] The delete options.
   * @param {object} [opts.columns] The columns to return.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async delete<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts: {
    columns: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<SelectResultFields<TSelectedFields>[] | null>;
  async delete<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<InferSelectModel<U>[] | null>;
  async delete<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    columns?: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }) {
    let where;

    if (opts?.where) {
      where = this.resolveWhere(opts.where);
    }

    const qb: any = (opts?.tx || this.db).delete(this.table).where(where);

    const rows: any[] = await (opts?.columns ? qb.returning(opts.columns) : qb.returning());

    if (rows.length < 1) {
      return [];
    }

    await Promise.all(rows.map(async (row) => this.afterDelete(row)));

    return rows;
  }

  /**
   * Soft delete the data rows in the database based on the where condition by setting the deleteTime column to current time.
   *
   * @param {object} [opts] The delete options.
   * @param {object} [opts.columns] The columns to return.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async softDelete<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts: {
    columns: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<SelectResultFields<TSelectedFields>[] | null>;
  async softDelete<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<InferSelectModel<U>[] | null>;
  async softDelete<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    columns?: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }) {
    if (!this.hasSoftDelete()) {
      throw new BadRequestException('Table does not support soft delete');
    }

    let where;

    if (opts?.where) {
      where = this.resolveWhere(opts.where);
    }

    const qb: any = (opts?.tx || this.db)
      .update(this.table)
      .set({
        ...(this.hasSoftDelete() ? { deleteTime: sql`NOW()` } : {}),
        ...(this.hasUpdateTime() ? { updateTime: sql`NOW()` } : {}),
      })
      .where(where);

    const rows: any[] = await (opts?.columns ? qb.returning(opts.columns) : qb.returning());

    if (rows.length < 1) {
      return [];
    }

    await Promise.all(rows.map(async (row) => this.afterDelete(row)));

    return rows;
  }

  /**
   * Return the 1st record based on the config.
   *
   * @param {FindFirstOpts<QConfig>} [opts] The find first options.
   * @param {object} [opts.columns] The columns to select.
   * @param {object} [opts.extras] The extra columns to return.
   * @param {object} [opts.orderBy] The sorting order.
   * @param {object} [opts.where] The where filter (Drizzle relational filter object).
   * @param {object} [opts.with] The relations to include in query.
   * @param {boolean} [opts.showDeleted=false] When true, include soft-deleted rows.
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async findFirst<QConfig extends FindFirstQueryConfig<TRel, V>>(opts?: FindFirstOpts<QConfig>) {
    const { tx, showDeleted, ...config } = opts || ({} as any);
    const qb = tx || this.db;

    const finalConfig = showDeleted ? config : withSoftDeleteFilter(config, this.hasSoftDelete());

    const row = await qb.query[this.tableName].findFirst(finalConfig || {});

    if (!row) {
      return null;
    }

    await this.afterFind(row);

    return row as BuildQueryResult<TRel, TRel[V], QConfig>;
  }

  /**
   * Return the 1st record based on the config or throw a `NotFoundException` if not found.
   *
   * @param {FindFirstOpts<QConfig>} [opts] The find first options.
   * @param {object} [opts.columns] The columns to select.
   * @param {object} [opts.extras] The extra columns to return.
   * @param {object} [opts.orderBy] The sorting order.
   * @param {object} [opts.where] The where filter (Drizzle relational filter object).
   * @param {object} [opts.with] The relations to include in query.
   * @param {boolean} [opts.showDeleted=false] When true, include soft-deleted rows.
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async findFirstOrFail<QConfig extends FindFirstQueryConfig<TRel, V>>(
    opts?: FindFirstOpts<QConfig>,
  ): Promise<BuildQueryResult<TRel, TRel[V], QConfig>> {
    const result = await this.findFirst(opts);

    if (!result) {
      throw new NotFoundException();
    }

    return result;
  }

  /**
   * Return all the records based on the config.
   *
   * @param {FindManyOpts<QConfig>} [opts] The find many options.
   * @param {object} [opts.columns] The columns to select.
   * @param {object} [opts.extras] The extras columns to return.
   * @param {object} [opts.limit] The limit number of the returned rows.
   * @param {object} [opts.offset] The offset of the returned rows.
   * @param {object} [opts.orderBy] The sorting order.
   * @param {SQL<unknown>} [opts.where] The where filter.
   * @param {object} [opts.with] The relations to include in query.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async findMany<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: FindManyOpts<QConfig>) {
    const { tx, showDeleted, ...config } = opts || ({} as any);
    const qb = tx || this.db;

    const finalConfig = showDeleted ? config : withSoftDeleteFilter(config, this.hasSoftDelete());

    const rows = await qb.query[this.tableName].findMany(finalConfig || {});

    if (!rows || rows.length < 1) {
      return [];
    }

    await Promise.all(rows.map(async (row: any) => this.afterFind(row)));

    return rows as BuildQueryResult<TRel, TRel[V], QConfig>[];
  }

  /**
   * Update the data rows in the database based on the where condition.
   *
   * @param {PgUpdateSetSource<U>} value The values to update to.
   * @param {object} [opts] The update options.
   * @param {object} [opts.columns] The fields to return.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async update<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(
    value: PgUpdateSetSource<U>,
    opts: {
      columns: TSelectedFields;
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<SelectResultFields<TSelectedFields>[]>;
  async update<QConfig extends FindManyQueryConfig<TRel, V>>(
    value: PgUpdateSetSource<U>,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<InferSelectModel<U>[]>;
  async update<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(
    value: PgUpdateSetSource<U>,
    opts?: {
      columns?: TSelectedFields;
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ) {
    let where;

    if (opts?.where) {
      where = this.resolveWhere(opts.where);
    }

    await this.beforeUpdate(value);

    const qb: any = (opts?.tx || this.db)
      .update(this.table)
      .set({
        ...value,
        ...(this.hasUpdateTime() ? { updateTime: sql`NOW()` } : {}),
      })
      .where(where);

    const rows: any[] = await (opts?.columns ? qb.returning(opts.columns) : qb.returning());

    if (rows.length < 1) {
      return [];
    }

    await Promise.all(rows.map((row) => this.afterUpdate(row)));

    return rows;
  }

  /**
   * Restore soft-deleted rows by setting deleteTime to null.
   *
   * Note: only the Drizzle relational filter object form is supported for `where`.
   * Raw SQL and callback forms are not handled here.
   *
   * @param {object} [opts] The restore options.
   * @param {object} [opts.columns] The columns to return.
   * @param {object} [opts.where] The where filter (Drizzle relational filter object).
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async restore<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts: {
    columns: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<SelectResultFields<TSelectedFields>[]>;
  async restore<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    where?: QConfig['where'];
    tx?: Transaction;
  }): Promise<InferSelectModel<U>[]>;
  async restore<TSelectedFields extends SelectedFieldsFlat, QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    columns?: TSelectedFields;
    where?: QConfig['where'];
    tx?: Transaction;
  }) {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const qb: any = (opts?.tx || this.db)
      .update(this.table)
      .set({
        ...(this.hasSoftDelete() ? { deleteTime: null } : {}),
        ...(this.hasUpdateTime() ? { updateTime: sql`NOW()` } : {}),
      })
      .where(where);

    const rows: any[] = await (opts?.columns ? qb.returning(opts.columns) : qb.returning());

    if (rows.length < 1) {
      return [];
    }

    return rows;
  }

  /**
   * Increment a numeric column by the given amount.
   *
   * @param {string} column The column to increment.
   * @param {number} amount The amount to increment by (default: 1).
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async increment<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: keyof InferSelectModel<U> & string,
    amount: number = 1,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<InferSelectModel<U>[]> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows: any[] = await (opts?.tx || (this.db as any))
      .update(this.table)
      .set({
        [column]: sql`${col} + ${amount}`,
        ...(this.hasUpdateTime() ? { updateTime: sql`NOW()` } : {}),
      })
      .where(where)
      .returning();

    return rows;
  }

  /**
   * Decrement a numeric column by the given amount.
   *
   * @param {string} column The column to decrement.
   * @param {number} amount The amount to decrement by (default: 1).
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns
   */
  async decrement<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: keyof InferSelectModel<U> & string,
    amount: number = 1,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<InferSelectModel<U>[]> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows: any[] = await (opts?.tx || (this.db as any))
      .update(this.table)
      .set({
        [column]: sql`${col} - ${amount}`,
        ...(this.hasUpdateTime() ? { updateTime: sql`NOW()` } : {}),
      })
      .where(where)
      .returning();

    return rows;
  }

  /**
   * Check if at least one record exists matching the where condition.
   *
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<boolean>}
   */
  async exists<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    where?: QConfig['where'];
    showDeleted?: boolean;
    tx?: Transaction;
  }): Promise<boolean> {
    const { tx, showDeleted, ...config } = opts || {};

    const finalConfig = showDeleted ? config : withSoftDeleteFilter(config, this.hasSoftDelete());

    let where;

    if (finalConfig.where) {
      where = this.filterToSQL(finalConfig.where);
    }

    const result = await (tx || this.db).execute(
      sql`SELECT EXISTS(SELECT 1 FROM ${this.table}${where ? sql` WHERE ${where}` : sql``}) AS "exists"`,
    );

    return Boolean((result.rows[0] as any)?.exists);
  }

  /**
   * Count the number of rows matching the where condition.
   *
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<number>}
   */
  async count<QConfig extends FindManyQueryConfig<TRel, V>>(opts?: {
    where?: QConfig['where'];
    showDeleted?: boolean;
    tx?: Transaction;
  }): Promise<number> {
    const { showDeleted, ...config } = opts || {};

    const finalConfig = showDeleted ? config : withSoftDeleteFilter(config, this.hasSoftDelete());

    let where;

    if (finalConfig.where) {
      where = this.filterToSQL(finalConfig.where);
    }

    const rows = await (opts?.tx || (this.db as any))
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(this.table)
      .where(where);

    return rows[0]?.count ?? 0;
  }

  /**
   * Compute the sum of a numeric column.
   *
   * @param {string} column The column to sum.
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<number>}
   */
  async sum<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: NumericKeys<U>,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<number> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows = await (opts?.tx || (this.db as any))
      .select({ value: sql<number>`COALESCE(SUM(${col}), 0)`.mapWith(Number) })
      .from(this.table)
      .where(where);

    return rows[0]?.value ?? 0;
  }

  /**
   * Compute the average of a numeric column.
   *
   * @param {string} column The column to average.
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<number>}
   */
  async average<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: NumericKeys<U>,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<number> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows = await (opts?.tx || (this.db as any))
      .select({ value: sql<number>`COALESCE(AVG(${col}), 0)`.mapWith(Number) })
      .from(this.table)
      .where(where);

    return rows[0]?.value ?? 0;
  }

  /**
   * Get the minimum value of a numeric column.
   *
   * @param {string} column The column to get the minimum of.
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<number | null>}
   */
  async minimum<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: NumericKeys<U>,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<number | null> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows = await (opts?.tx || (this.db as any))
      .select({ value: sql<number | null>`MIN(${col})`.mapWith(Number) })
      .from(this.table)
      .where(where);

    return rows[0]?.value ?? null;
  }

  /**
   * Get the maximum value of a numeric column.
   *
   * @param {string} column The column to get the maximum of.
   * @param {object} [opts] The options.
   * @param {SQL<unknown>} [opts.where] The SQL where filter.
   * @param {Transaction<T>} [opts.tx] The SQL transaction.
   * @returns {Promise<number | null>}
   */
  async maximum<QConfig extends FindManyQueryConfig<TRel, V>>(
    column: NumericKeys<U>,
    opts?: {
      where?: QConfig['where'];
      tx?: Transaction;
    },
  ): Promise<number | null> {
    let where;

    if (opts?.where) {
      where = this.filterToSQL(opts.where);
    }

    const col = (this.table as any)[column];

    const rows = await (opts?.tx || (this.db as any))
      .select({ value: sql<number | null>`MAX(${col})`.mapWith(Number) })
      .from(this.table)
      .where(where);

    return rows[0]?.value ?? null;
  }

  /**
   * Return the paginated records based on the config.
   *
   * @param {PaginateByOffsetOpts<QConfig>} [opts] The offset pagination options.
   * @param {object} [opts.columns] The columns to select.
   * @param {object} [opts.extras] The extra columns to return.
   * @param {string} [opts.orderBy='id'] Comma-separated sort fields in `"field:asc,field:desc"` format.
   * @param {boolean} [opts.showDeleted=false] When true, include soft-deleted rows.
   * @param {object} [opts.where] The where filter (Drizzle relational filter object).
   * @param {object} [opts.with] The relations to include in query.
   * @param {number} [opts.page=1] The current page (1-based).
   * @param {number} [opts.pageSize=10] The number of rows per page.
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async paginateByOffset<QConfig extends PaginateByOffsetQueryConfig<TRel, V>>(opts?: PaginateByOffsetOpts<QConfig>) {
    const {
      page = 1,
      pageSize = 10,
      orderBy = 'id',
      showDeleted,
      ...config
    } = opts || {
      columns: undefined,
      extras: undefined,
      orderBy: undefined,
      tx: undefined,
      where: undefined,
      with: undefined,
    };
    const qb = config.tx || this.db;

    const countConfig = showDeleted
      ? { where: config.where }
      : withSoftDeleteFilter({ where: config.where }, this.hasSoftDelete());
    let countWhere;

    if (countConfig.where) {
      countWhere = this.filterToSQL(countConfig.where);
    }

    validatePagination(page, pageSize);

    const parsed = parseOrderByString(orderBy ?? 'id');
    const orderByFields = validateOrderByFields(parsed, new Set(this.columns.map(String)), this.tableName as string);

    const orderByConditions = {} as Record<string, 'asc' | 'desc'>;

    orderByFields.forEach(({ key, direction }) => {
      orderByConditions[key] = direction;
    });

    const [rows, totals] = await Promise.all([
      this.findMany({
        ...config,
        orderBy: orderByConditions,
        showDeleted,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      (qb as any)
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(this.table)
        .where(countWhere),
    ]);

    const totalRows = totals?.[0]?.count ?? 0;

    return {
      data: rows as unknown as BuildQueryResult<TRel, TRel[V], QConfig>[],
      meta: {
        total: totalRows,
        pageSize: pageSize,
        page: page,
        pageCount: Math.ceil(totalRows / pageSize),
      },
    };
  }

  /**
   * Return the paginated records based on a cursor (keyset pagination).
   *
   * Supports multiple sort fields for deterministic pagination over any column combination.
   * Returns a `nextPageToken` (base64-encoded cursor) to pass as `pageToken` on the next call.
   *
   * @param {PaginateByCursorOpts<QConfig>} [opts] The cursor pagination options.
   * @param {object} [opts.columns] The columns to select.
   * @param {object} [opts.extras] The extra columns to return.
   * @param {string} [opts.orderBy='id'] Comma-separated sort fields in `"field:asc,field:desc"` format.
   * @param {number} [opts.pageSize=10] The number of rows per page.
   * @param {string|null} [opts.pageToken=null] The cursor from the previous page's `nextPageToken`.
   * @param {boolean} [opts.showDeleted=false] When true, include soft-deleted rows.
   * @param {object} [opts.where] A base where filter (Drizzle relational filter object) applied before cursor and soft-delete conditions.
   * @param {object} [opts.with] The relations to include in query.
   * @param {Transaction} [opts.tx] The SQL transaction.
   * @returns
   */
  async paginateByCursor<QConfig extends PaginateByCursorQueryConfig<TRel, V>>(opts?: PaginateByCursorOpts<QConfig>) {
    const { pageSize = 10, pageToken = null, orderBy, showDeleted, tx, ...config } = opts || ({} as any);

    validatePagination(1, pageSize);

    const parsed = parseOrderByString(orderBy ?? 'id');
    const validColumns = new Set(this.columns.map(String));
    const orderByFields = appendStableTiebreaker(
      validateOrderByFields(parsed, validColumns, this.tableName as string),
      validColumns,
    );

    const orderByConditions = {} as Record<string, 'asc' | 'desc'>;

    orderByFields.forEach(({ key, direction }) => {
      orderByConditions[key] = direction;
    });

    config.orderBy = orderByConditions;

    let cursorConditions;

    if (pageToken) {
      const cursor = decodeCursor(pageToken, orderByFields);

      cursorConditions = buildCursorConditions(orderByFields, cursor);
    }

    const combinedWhere: any = {};

    combinedWhere.AND = [...(config?.where ? [config.where] : []), ...(cursorConditions ? [cursorConditions] : [])];

    config.where = combinedWhere;

    const rows = await this.findMany({
      ...config,
      showDeleted,
      limit: pageSize + 1,
      tx,
    });

    const hasNextPage = rows.length > pageSize;

    if (hasNextPage) {
      rows.pop();
    }

    const nextPageToken = hasNextPage
      ? encodeCursor(Object.fromEntries(orderByFields.map(({ key }) => [key, rows[rows.length - 1]![key]])))
      : null;

    return {
      data: rows as BuildQueryResult<TRel, TRel[V], QConfig>[],
      meta: {
        nextPageToken,
      },
    };
  }
}
