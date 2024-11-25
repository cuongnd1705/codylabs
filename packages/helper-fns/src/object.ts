import { isPrimitive } from './typed';

type LowercasedKeys<T extends Record<string, any>> = {
  [P in keyof T & string as Lowercase<P>]: T[P];
};

type UppercasedKeys<T extends Record<string, any>> = {
  [P in keyof T & string as Uppercase<P>]: T[P];
};

/**
 * Removes (shakes out) undefined entries from an
 * object. Optional second argument shakes out values
 * by custom evaluation.
 */
export const shake = <RemovedKeys extends string, T>(
  obj: T,
  filter: (value: any) => boolean = (x) => x === undefined,
): Omit<T, RemovedKeys> => {
  if (!obj) {
    return {} as T;
  }

  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => !filter(value))) as Omit<T, RemovedKeys>;
};

/**
 * Map over all the keys of an object to return
 * a new object
 */
export const mapKeys = <TValue, TKey extends string | number | symbol, TNewKey extends string | number | symbol>(
  obj: Record<TKey, TValue>,
  mapFunc: (key: TKey, value: TValue) => TNewKey,
): Record<TNewKey, TValue> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [mapFunc(key as TKey, value as TValue), value]),
  ) as Record<TNewKey, TValue>;
};

/**
 * Map over all the keys to create a new object
 */
export const mapValues = <TValue, TKey extends string | number | symbol, TNewValue>(
  obj: Record<TKey, TValue>,
  mapFunc: (value: TValue, key: TKey) => TNewValue,
): Record<TKey, TNewValue> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, mapFunc(value as TValue, key as TKey)]),
  ) as Record<TKey, TNewValue>;
};

/**
 * Map over all the keys to create a new object
 */
export const mapEntries = <
  TKey extends string | number | symbol,
  TValue,
  TNewKey extends string | number | symbol,
  TNewValue,
>(
  obj: Record<TKey, TValue>,
  toEntry: (key: TKey, value: TValue) => [TNewKey, TNewValue],
): Record<TNewKey, TNewValue> => {
  if (!obj) {
    return {} as Record<TNewKey, TNewValue>;
  }

  return Object.fromEntries(Object.entries(obj).map(([key, value]) => toEntry(key as TKey, value as TValue))) as Record<
    TNewKey,
    TNewValue
  >;
};

/**
 * Convert all keys in an object to lower case
 */
export const lowerize = <T extends Record<string, any>>(obj: T) =>
  mapKeys(obj, (k) => k.toLowerCase()) as LowercasedKeys<T>;

/**
 * Convert all keys in an object to upper case
 */
export const upperize = <T extends Record<string, any>>(obj: T) =>
  mapKeys(obj, (k) => k.toUpperCase()) as UppercasedKeys<T>;

/**
 * Creates a shallow copy of the given object/value.
 * @param {*} obj value to clone
 * @returns {*} shallow clone of the given value
 */
export const clone = <T>(obj: T): T => {
  if (isPrimitive(obj)) {
    return obj;
  }

  if (typeof obj === 'function') {
    return obj.bind({});
  }

  return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
};

/**
 * Pick a list of properties from an object
 * into a new object
 */
export const pick = <T extends object, TKeys extends keyof T>(obj: T, keys: TKeys[]): Pick<T, TKeys> => {
  if (!obj) {
    return {} as Pick<T, TKeys>;
  }

  return Object.fromEntries(keys.filter((key) => key in obj).map((key) => [key, obj[key]])) as Pick<T, TKeys>;
};

/**
 * Omit a list of properties from an object
 * returning a new object with the properties
 * that remain
 */
export const omit = <T, TKeys extends keyof T>(obj: T, keys: TKeys[]): Omit<T, TKeys> => {
  if (!obj) {
    return {} as Omit<T, TKeys>;
  }

  const keySet = new Set(keys);

  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keySet.has(key as TKeys))) as Omit<T, TKeys>;
};
