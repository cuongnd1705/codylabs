export const normalizeEmail = (email: string): string => {
  const DOT_REG = /\./g;
  const [name, host] = email.split('@');

  let [beforePlus] = name.split('+');

  beforePlus = beforePlus.replaceAll(DOT_REG, '');

  const result = `${beforePlus.toLowerCase()}@${host.toLowerCase()}`;

  return result;
};
