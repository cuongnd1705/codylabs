export const normalizeEmail = (email: string): string => {
  const DOT_REG = /\./g;
  const [name, host] = email.split('@');

  let [beforePlus] = name.split('+');

  beforePlus = beforePlus.replaceAll(DOT_REG, '');

  const result = `${beforePlus.toLowerCase()}@${host.toLowerCase()}`;

  return result;
};

export const snakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

export const isEmpty = (value: any): boolean => {
  return (
    value == null ||
    ((typeof value === 'string' || Array.isArray(value)) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  );
};
