/**
 * Given two arrays, returns true if any
 * elements intersect
 */
export const intersects = <T, K extends string | number | symbol>(
  listA: readonly T[],
  listB: readonly T[],
  identity?: (t: T) => K,
): boolean => {
  if (!listA || !listB) {
    return false;
  }

  const ident = identity ?? ((x: T) => x as unknown as K);

  const dictB = listB.reduce(
    (acc, item) => {
      acc[ident(item)] = true;

      return acc;
    },
    {} as Record<string | number | symbol, boolean>,
  );

  return listA.some((value) => dictB[ident(value)]);
};

/**
 * Returns all items from the first list that
 * do not exist in the second list.
 */
export const diff = <T>(
  root: readonly T[],
  other: readonly T[],
  identity: (item: T) => string | number | symbol = (t: T) => t as unknown as string | number | symbol,
): T[] => {
  if (!root?.length && !other?.length) {
    return [];
  }

  if (root?.length === undefined) {
    return [...other];
  }

  if (!other?.length) {
    return [...root];
  }

  const bKeys = other.reduce(
    (acc, item) => {
      acc[identity(item)] = true;

      return acc;
    },
    {} as Record<string | number | symbol, boolean>,
  );

  return root.filter((a) => !bKeys[identity(a)]);
};
