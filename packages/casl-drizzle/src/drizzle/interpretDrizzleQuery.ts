import { CompoundCondition, type Condition, FieldCondition, type Interpreter } from '@ucast/core';
import { type JsInterpreter, createJsInterpreter, eq, ne, and, or, within, lt, lte, gt, gte, compare } from '@ucast/js';

// ─── String operators ────────────────────────────────────────────────────────

/** Convert a SQL LIKE pattern to a RegExp. `%` → `.*`, `_` → `.` */
function likeToRegex(pattern: string, flags = ''): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${regexStr}$`, flags);
}

type StringInterpreter = JsInterpreter<FieldCondition<string>, Record<string, string>>;

const like: StringInterpreter = (condition, object, { get }) => {
  const value = get(object, condition.field);
  if (typeof value !== 'string') return false;
  return likeToRegex(condition.value).test(value);
};

const ilike: StringInterpreter = (condition, object, { get }) => {
  const value = get(object, condition.field);
  if (typeof value !== 'string') return false;
  return likeToRegex(condition.value, 'i').test(value);
};

const notLike: StringInterpreter = (condition, object, ctx) => !like(condition, object, ctx);

const notIlike: StringInterpreter = (condition, object, ctx) => !ilike(condition, object, ctx);

// ─── Null operators ──────────────────────────────────────────────────────────

const isNull: JsInterpreter<FieldCondition<boolean>> = (condition, object, { get }) => {
  const value = get(object, condition.field);
  return condition.value ? value === null || value === undefined : value !== null && value !== undefined;
};

const isNotNull: JsInterpreter<FieldCondition<boolean>> = (condition, object, { get }) => {
  const value = get(object, condition.field);
  return condition.value ? value !== null && value !== undefined : value === null || value === undefined;
};

// ─── Array operators ─────────────────────────────────────────────────────────

type ArrayInterpreter<TConditionValue> = JsInterpreter<FieldCondition<TConditionValue>, Record<string, unknown[]>>;

const arrayContains: ArrayInterpreter<unknown[]> = (condition, object, { get }) => {
  const value = get(object, condition.field);
  return Array.isArray(value) && condition.value.every((v) => value.includes(v));
};

const arrayContained: ArrayInterpreter<unknown[]> = (condition, object, { get }) => {
  const value = get(object, condition.field);
  return Array.isArray(value) && value.every((v) => condition.value.includes(v));
};

const arrayOverlaps: ArrayInterpreter<unknown[]> = (condition, object, { get }) => {
  const value = get(object, condition.field);
  return Array.isArray(value) && condition.value.some((v) => value.includes(v));
};

// ─── NOT compound operator ──────────────────────────────────────────────────

const not: JsInterpreter<CompoundCondition> = (condition, object, { interpret }) => {
  return condition.value.every((subCondition) => !interpret(subCondition, object));
};

// ─── Comparable helper ───────────────────────────────────────────────────────

function toComparable(value: unknown) {
  return value && typeof value === 'object' ? value.valueOf() : value;
}

const compareValues: typeof compare = (a, b) => compare(toComparable(a), toComparable(b));

// ─── Interpreter ─────────────────────────────────────────────────────────────

export const interpretDrizzleQuery = createJsInterpreter(
  {
    equals: eq,
    eq,
    ne,
    in: within,
    lt,
    lte,
    gt,
    gte,
    like,
    ilike,
    notLike,
    notIlike,
    isNull,
    isNotNull,
    arrayContains,
    arrayContained,
    arrayOverlaps,
    and,
    or,
    AND: and,
    OR: or,
    NOT: not,
  },
  {
    get: (object, field) => (object as Record<string, unknown>)[field],
    compare: compareValues,
  },
) as Interpreter<Condition, boolean>;
