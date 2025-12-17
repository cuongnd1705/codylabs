/**
 * Capitalize the first word of the string
 *
 * @param {string} str - The string to capitalize.
 * @returns {string} - The capitalized string.
 */
export const capitalize = (str: string): string => {
  if (!str) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Formats the given string in camel case fashion
 *
 * @param {string} str - The string to format.
 * @returns {string} - The camel cased string.
 */
export const camel = (str: string): string => {
  if (!str) {
    return '';
  }

  const parts = str
    .replace(/([A-Z])+/g, capitalize)
    .split(/(?=[A-Z])|[\.\-\s_]/)
    .map((x, index) => (index === 0 ? x.toLowerCase() : capitalize(x)));

  return parts.join('');
};

/**
 * Formats the given string in snake case fashion
 *
 * @param {string} str - The string to format.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.splitOnNumber=true] - Whether to split on numbers.
 * @returns {string} - The snake cased string.
 */
export const snake = (
  str: string,
  options?: {
    splitOnNumber?: boolean;
  },
): string => {
  const parts =
    str
      ?.replace(/([A-Z])+/g, capitalize)
      .split(/(?=[A-Z])|[\.\-\s_]/)
      .map((x) => x.toLowerCase()) ?? [];

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const result = parts.reduce((acc, part) => `${acc}_${part.toLowerCase()}`);

  return options?.splitOnNumber === false
    ? result
    : result.replace(/([A-Za-z]{1}[0-9]{1})/, (val) => `${val[0]}_${val[1]}`);
};

/**
 * Formats the given string in kebab case fashion
 *
 * @param {string} str - The string to format.
 * @returns {string} - The kebab cased string.
 */
export const kebab = (str: string): string => {
  const parts =
    str
      ?.replace(/([A-Z])+/g, capitalize)
      ?.split(/(?=[A-Z])|[\.\-\s_]/)
      .map((x) => x.toLowerCase()) ?? [];

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return parts.reduce((acc, part) => `${acc}-${part.toLowerCase()}`);
};

/**
 * Formats the given string in pascal case fashion
 *
 * @param {string} str - The string to format.
 * @returns {string} - The pascal cased string.
 */
export const pascal = (str: string): string => {
  const parts = str?.split(/[\.\-\s_]/).map((x) => x.toLowerCase()) ?? [];

  if (parts.length === 0) {
    return '';
  }

  return parts.map((str) => str.charAt(0).toUpperCase() + str.slice(1)).join('');
};

/**
 * Formats the given string in title case fashion
 *
 * @param {string | null | undefined} str - The string to format.
 * @returns {string} - The title cased string.
 */
export const title = (str: string | null | undefined): string => {
  if (!str) {
    return '';
  }

  return str
    .split(/[\.\-\s_]+/)
    .filter((s) => !!s)
    .map((s) => capitalize(s.toLowerCase()))
    .join(' ');
};

/**
 * Formats the given string in kebab case fashion
 *
 * @param {string} str - The string to format.
 * @returns {string} - The constant cased string.
 */
export const constant = (str: string): string => {
  if (!str) {
    return '';
  }

  return snake(str).toUpperCase();
};

/**
 * Replaces placeholders with data in template strings.
 * The default expression looks for {{name}} to identify names.
 *
 * @param {string} str - The template string.
 * @param {Record<string, any>} data - The data to replace in the template.
 * @param {RegExp} [regex=/\{\{(.+?)\}\}/g] - The regex to identify placeholders.
 * @returns {string} - The formatted string.
 */
export const template = (str: string, data: Record<string, any>, regex = /\{\{(.+?)\}\}/g) => {
  return Array.from(str.matchAll(regex)).reduce((acc, match) => acc.replace(match[0], data[match[1]]), str);
};

/**
 * Trims all prefix and suffix characters from the given string.
 * Like the builtin trim function but accepts other characters you would like to trim and trims multiple characters.
 *
 * @param {string | null | undefined} str - The string to trim.
 * @param {string} [charsToTrim=' '] - The characters to trim.
 * @returns {string} - The trimmed string.
 */
export const trim = (str: string | null | undefined, charsToTrim = ' ') => {
  if (!str) {
    return '';
  }

  const toTrim = charsToTrim.replace(/[\W]{1}/g, '\\$&');
  const regex = new RegExp(`^[${toTrim}]+|[${toTrim}]+$`, 'g');

  return str.replace(regex, '');
};

/**
 * Normalizes an email address by converting it to lowercase,
 * removing dots from the local part, and ignoring any characters
 * after a plus sign in the local part.
 *
 * @param {string} email - The email address to normalize.
 * @returns {string} - The normalized email address.
 */
export const normalizeEmail = (email: string): string => {
  const [name, host] = email.toLowerCase().split('@');
  const beforePlus = name.split('+')[0].replace(/\./g, '');
  return `${beforePlus}@${host}`;
};
