import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { Loader } from '../loaders';

export interface EnvModuleOptions {
  /**
   * Standard Schema-compatible schema (Zod, Valibot, ArkType, etc.) used to
   * validate and transform the merged configuration object.
   *
   * When omitted, the raw merged config is used as-is without validation.
   */
  schema?: StandardSchemaV1;
  /**
   * One or more loaders that produce partial configuration objects. Loaders
   * are called in order and their results are deep-merged — later loaders
   * take precedence over earlier ones.
   *
   * Use the built-in `fileLoader()` and `processEnvLoader()` helpers, or
   * supply a custom `() => Record<string, unknown>` function.
   */
  load?: Loader | Loader[];
}
