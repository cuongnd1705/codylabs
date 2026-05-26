const isObject = (item: unknown): item is Record<string, unknown> => {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
};

export const merge = <T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T => {
  const result = structuredClone(target);

  for (const source of sources) {
    if (!isObject(source)) {
      continue;
    }

    for (const key in source) {
      if (isObject(source[key]) && isObject(result[key])) {
        (result as Record<string, unknown>)[key] = merge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        (result as Record<string, unknown>)[key] = source[key];
      }
    }
  }

  return result;
};
