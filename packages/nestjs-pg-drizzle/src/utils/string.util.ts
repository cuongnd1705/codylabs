export const capitalize = (str: string): string => {
  if (!str) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const camel = (str: string): string => {
  if (!str) {
    return '';
  }

  const parts = str
    .replace(/([A-Z])+/g, capitalize)
    .split(/(?=[A-Z])|[.\-\s_]/)
    .map((x, index) => (index === 0 ? x.toLowerCase() : capitalize(x)));

  return parts.join('');
};
