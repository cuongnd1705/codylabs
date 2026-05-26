type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

export type Paths<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : never;
      }[keyof T]
    : '';

export type Leaves<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: T[K] extends object ? Join<K, Leaves<T[K], Prev[D]>> : `${K & (string | number)}`;
      }[keyof T]
    : '';

export type NestedValueOf<Obj, Key> = Key extends keyof Obj
  ? Obj[Key]
  : Key extends `${infer Parent}.${infer Rest}`
    ? Parent extends keyof Obj
      ? NestedValueOf<Obj[Parent], Rest>
      : unknown
    : unknown;

export type KeyOf<T> = keyof T extends never ? string : keyof T;

export type PathValue<T, P extends Paths<T>> = NestedValueOf<T, P>;
