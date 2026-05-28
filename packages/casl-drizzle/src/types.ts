import type { hkt } from '@casl/ability';

import type { Model } from './drizzle';

/** Operators available on each column in a Drizzle RQB v2 where clause */
export interface DrizzleFieldFilter<T = unknown> {
  eq?: T | undefined;
  ne?: T | undefined;
  gt?: T | undefined;
  gte?: T | undefined;
  lt?: T | undefined;
  lte?: T | undefined;
  in?: T[] | undefined;
  notIn?: T[] | undefined;
  like?: string | undefined;
  ilike?: string | undefined;
  notLike?: string | undefined;
  notIlike?: string | undefined;
  isNull?: true | undefined;
  isNotNull?: true | undefined;
  arrayContains?: unknown[] | undefined;
  arrayContained?: unknown[] | undefined;
  arrayOverlaps?: unknown[] | undefined;
  NOT?: DrizzleFieldFilter<T> | undefined;
  OR?: DrizzleFieldFilter<T>[] | undefined;
  AND?: DrizzleFieldFilter<T>[] | undefined;
}

/** A single field filter can be the operators object or a direct value shorthand */
export type DrizzleColumnFilter<T = unknown> = DrizzleFieldFilter<T> | T;

/** The full where clause for a table — column filters + logical operators */
export type DrizzleWhereInput<TRecord extends object = Record<string, unknown>> = {
  [K in keyof TRecord]?: DrizzleColumnFilter<TRecord[K]>;
} & {
  OR?: DrizzleWhereInput<TRecord>[] | undefined;
  AND?: DrizzleWhereInput<TRecord>[] | undefined;
  NOT?: DrizzleWhereInput<TRecord> | undefined;
};

type ExtractModelName<TObject, TModelName extends PropertyKey> = TObject extends { kind: TModelName }
  ? TObject['kind']
  : TObject extends { readonly __caslSubjectType__: TModelName }
    ? TObject['__caslSubjectType__']
    : TObject extends { __typename: TModelName }
      ? TObject['__typename']
      : TModelName;

/**
 * Maps subject names to their where input shapes.
 * This is analogous to Prisma's TypeMap.
 */
export interface DrizzleTypesMap<TSubjects extends Record<string, object>> {
  ModelName: Extract<keyof TSubjects, string>;
  WhereInput: {
    [K in keyof TSubjects]: DrizzleWhereInput<TSubjects[K]>;
  };
}

interface DrizzleQueryTypeFactory<TSubjects extends Record<string, object>> extends hkt.GenericFactory {
  produce: DrizzleTypesMap<TSubjects>['WhereInput'][ExtractModelName<this[0], DrizzleTypesMap<TSubjects>['ModelName']>];
}

export type DrizzleModel = Model<Record<string, any>, string>;

export declare const ɵdrizzleTypes: unique symbol;

/**
 * The conditions type to use with `Ability`.
 *
 * @example
 * ```ts
 * type AppAbility = Ability<
 *   [string, 'all' | AppSubjects],
 *   DrizzleQuery<{ User: User; Post: Post }>
 * >;
 * ```
 */
export type DrizzleQuery<
  TSubjects extends Record<string, object>,
  T extends DrizzleModel = DrizzleModel,
> = DrizzleTypesMap<TSubjects>['WhereInput'][ExtractModelName<T, DrizzleTypesMap<TSubjects>['ModelName']>] &
  hkt.Container<DrizzleQueryTypeFactory<TSubjects>> & {
    [ɵdrizzleTypes]?: DrizzleTypesMap<TSubjects>;
  };

export type BaseDrizzleQuery = {
  [ɵdrizzleTypes]?: DrizzleTypesMap<Record<string, object>>;
};

export type InferDrizzleTypes<T extends BaseDrizzleQuery> = Exclude<T[typeof ɵdrizzleTypes], undefined>;

/**
 * Extract the WhereInput type for a specific model name.
 *
 * @example
 * ```ts
 * type PostWhere = WhereInput<AppAbility, 'Post'>;
 * ```
 */
export type WhereInput<
  TSubjects extends Record<string, object>,
  TModelName extends keyof TSubjects,
> = DrizzleWhereInput<TSubjects[TModelName]>;
