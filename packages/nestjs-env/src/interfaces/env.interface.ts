import { EnvModuleOptions } from './env-module-option.interface';

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

export type RequiredPaths<T> = {
  [K in keyof T]-?: T[K] extends undefined ? never : K;
}[keyof T];

export type OptionalPaths<T> = {
  [K in keyof T]-?: T[K] extends undefined ? K : never;
}[keyof T];

export type PathValue<T, P extends Paths<T>> = NestedValueOf<T, P>;

export type HasPath<T, P extends string> = P extends Paths<T> ? true : false;

export interface ConfigValidation<T> {
  isValid: boolean;
  errors: {
    path: string;
    message: string;
  }[];
  config: T;
}

export type EnvConfig<T> = T & {
  NODE_ENV: 'development' | 'production' | 'test' | string;
};

export interface ConfigWithMeta<T> {
  config: T;
  metadata: {
    loadedFiles: string[];
    loadedAt: Date;
    environment: string;
  };
}

export type Brand<T, B> = T & { __brand: B };
export type ConfigPath<T> = Brand<Paths<T>, 'ConfigPath'>;
export type ConfigValue<T, P extends Paths<T>> = Brand<NestedValueOf<T, P>, 'ConfigValue'>;

export type ConfigSchema<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? ConfigSchema<T[K]>
    : {
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        required?: boolean;
        default?: T[K];
        description?: string;
        validation?: (value: T[K]) => boolean;
      };
};

export type ConfigTransformer<T, U> = (config: T) => U;

export type ConditionalConfig<T, E extends string = string> = T & {
  [K in E as `${K}Override`]?: Partial<T>;
};

export type LoadConfigOptions = Omit<EnvModuleOptions, 'class'>;
