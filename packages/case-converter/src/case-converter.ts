/**
 * Type definition for processing options used in case conversion
 */
interface ProcessOptions {
  /** Custom separator to use between words (default: '_') */
  separator?: string;

  /** Custom regex pattern to split words (default: /(?=[A-Z])/) */
  split?: RegExp;

  /** Custom processing function for advanced transformations */
  process?: (
    key: string,
    convert: (key: string, options?: ProcessOptions) => string,
    options?: ProcessOptions,
  ) => string;
}

// Default configuration constants
const DEFAULT_SEPARATOR = '_';
const DEFAULT_SPLIT = /(?=[A-Z])/;

/**
 * Utility type checking functions to replace Lodash
 */
const isDate = (value: any): value is Date => value instanceof Date;
const isRegExp = (value: any): value is RegExp => value instanceof RegExp;
const isFunction = (value: any): value is Function => typeof value === 'function';
const isObject = (value: any): boolean => {
  return value !== null && typeof value === 'object';
};
const isBoolean = (value: any): value is boolean => typeof value === 'boolean';

/**
 * Recursively processes all keys in an object or array using the provided conversion function
 * @param convert - The conversion function to apply to each key
 * @param obj - The object or array to process
 * @param options - Processing options
 * @returns Processed object or array with converted keys
 */
const processKeys = (
  convert: (key: string, options?: ProcessOptions) => string,
  obj: any,
  options?: ProcessOptions,
): any => {
  if (!isObject(obj) || isDate(obj) || isRegExp(obj) || isBoolean(obj) || isFunction(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => processKeys(convert, item, options));
  }

  return Object.keys(obj).reduce(
    (acc, key) => {
      acc[convert(key, options)] = processKeys(convert, obj[key], options);

      return acc;
    },
    {} as Record<string, any>,
  );
};

/**
 * Separates words in a string using the specified separator
 * @param str - Input string to separate
 * @param options - Processing options
 * @returns String with separated words
 */
const separateWords = (str: string, options: ProcessOptions = {}): string => {
  const { separator = DEFAULT_SEPARATOR, split = DEFAULT_SPLIT } = options;

  return str.split(split).join(separator);
};

/**
 * Checks if a value can be parsed as a number
 * @param input - Value to check
 * @returns Boolean indicating if input is numerical
 */
const isNumerical = (input: any): boolean => {
  return !Number.isNaN(input - Number.parseFloat(input));
};

/**
 * Creates a processor function that can apply custom transformations
 * @param convert - Base conversion function
 * @param options - Processing options
 * @returns Processor function
 */
const processor = (convert: (key: string, options?: ProcessOptions) => string, options?: ProcessOptions) => {
  const callback = options?.process ?? convert;

  if (!isFunction(callback)) {
    return convert;
  }

  return (str: string, opts?: ProcessOptions) => callback(str, convert, opts);
};

/**
 * Converts a string to camelCase
 * @param str - Input string
 * @returns Camelized string
 */
export const camelize = (str: string): string => {
  if (isNumerical(str)) {
    return str;
  }

  const result = str.replace(/[-_\s]+(.)?/g, (_, chr: string) => (chr ? chr.toUpperCase() : ''));

  return result.charAt(0).toLowerCase() + result.slice(1);
};

/**
 * Converts a string to PascalCase
 * @param str - Input string
 * @returns Pascalized string
 */
export const pascalize = (str: string): string => {
  const camelized = camelize(str);

  return camelized.replace(/^./, (match) => match.toUpperCase());
};

/**
 * Converts a camelCase string to snake_case
 * @param str - Input string
 * @param options - Processing options
 * @returns Decamelized string
 */
export const decamelize = (str: string, options?: ProcessOptions): string => {
  return separateWords(str, options).toLowerCase();
};

/**
 * Converts all keys in an object from snake_case to camelCase
 * @param object - Input object
 * @param options - Processing options
 * @returns Object with camelized keys
 */
export const camelizeKeys = (object: any, options?: ProcessOptions): any => {
  return processKeys(processor(camelize, options), object, options);
};

/**
 * Converts all keys in an object from camelCase to snake_case
 * @param object - Input object
 * @param options - Processing options
 * @returns Object with decamelized keys
 */
export const decamelizeKeys = (object: any, options?: ProcessOptions): any => {
  return processKeys(processor(decamelize, options), object, options);
};

/**
 * Converts all keys in an object to PascalCase
 * @param object - Input object
 * @param options - Processing options
 * @returns Object with pascalized keys
 */
export const pascalizeKeys = (object: any, options?: ProcessOptions): any => {
  return processKeys(processor(pascalize, options), object, options);
};

/**
 * Converts all keys in an object from PascalCase to snake_case
 * @param object - Input object
 * @param options - Processing options
 * @returns Object with depascalized keys
 */
export const depascalizeKeys = (object: any, options?: ProcessOptions): any => {
  return decamelizeKeys(object, options);
};
