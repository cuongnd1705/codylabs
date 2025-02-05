export const isSymbol = (value: any): value is symbol => {
  return !!value && value.constructor === Symbol;
};

export const isArray = Array.isArray;

export const isObject = (value: any): value is object => {
  return !!value && value.constructor === Object;
};

export const isPrimitive = (value: any): boolean => {
  return value === undefined || value === null || (typeof value !== 'object' && typeof value !== 'function');
};

export const isFunction = (value: any): value is Function => {
  return !!(value?.constructor && value.call && value.apply);
};

export const isString = (value: any): value is string => {
  return typeof value === 'string' || value instanceof String;
};

export const isInt = (value: any): value is number => {
  return isNumber(value) && value % 1 === 0;
};

export const isFloat = (value: any): value is number => {
  return isNumber(value) && value % 1 !== 0;
};

export const isNumber = (value: any): value is number => {
  try {
    return Number(value) === value;
  } catch {
    return false;
  }
};

export const isDate = (value: any): value is Date => {
  return Object.prototype.toString.call(value) === '[object Date]';
};

export const isEmpty = (value: any) => {
  if (value === true || value === false) {
    return true;
  }

  if (value === null || value === undefined) {
    return true;
  }

  if (isNumber(value)) {
    return value === 0;
  }

  if (isDate(value)) {
    return Number.isNaN(value.getTime());
  }

  if (isFunction(value)) {
    return false;
  }

  if (isSymbol(value)) {
    return false;
  }

  const length = (value as any).length;

  if (isNumber(length)) {
    return length === 0;
  }

  const size = (value as any).size;

  if (isNumber(size)) {
    return size === 0;
  }

  const keys = Object.keys(value).length;

  return keys === 0;
};

export const isEqual = <T>(x: T, y: T): boolean => {
  if (Object.is(x, y)) {
    return true;
  }

  if (x instanceof Date && y instanceof Date) {
    return x.getTime() === y.getTime();
  }

  if (x instanceof RegExp && y instanceof RegExp) {
    return x.toString() === y.toString();
  }

  if (typeof x !== 'object' || x === null || typeof y !== 'object' || y === null) {
    return false;
  }

  const keysX = Reflect.ownKeys(x as unknown as object) as (keyof typeof x)[];
  const keysY = Reflect.ownKeys(y as unknown as object);

  if (keysX.length !== keysY.length) {
    return false;
  }

  for (const key of keysX) {
    if (!Reflect.has(y as unknown as object, key)) {
      return false;
    }

    if (!isEqual(x[key], y[key])) {
      return false;
    }
  }

  return true;
};
