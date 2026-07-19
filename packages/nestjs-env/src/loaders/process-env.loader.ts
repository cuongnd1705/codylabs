import destr from 'destr';

import type { Loader } from './types';

import { setNestedValue } from '../utils';

export interface ProcessEnvLoaderOptions {
  /**
   * Separator used to split environment variable keys into nested paths.
   * For example `APP__PORT=3000` with separator `__` becomes `{ app: { port: 3000 } }`.
   * @default '__'
   */
  nestingSeparator?: string;
}

/**
 * Loads configuration from `process.env`.
 *
 * Keys are lowercased and split by `nestingSeparator` to produce a nested
 * object. Values are coerced from strings using `destr` (e.g. `"true"` →
 * `true`, `"42"` → `42`).
 *
 * When used alongside `fileLoader`, place `processEnvLoader` last so that
 * environment variables take precedence over file values.
 */
export function processEnvLoader(options: ProcessEnvLoaderOptions = {}): Loader {
  return (): Record<string, unknown> => {
    const { nestingSeparator = '__' } = options;
    const nested: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) {
        continue;
      }

      const parts = key.toLowerCase().split(nestingSeparator);
      const coerced = destr(value);

      setNestedValue(nested, parts, coerced);
    }

    return nested;
  };
}
