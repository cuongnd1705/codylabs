import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV_CONFIG } from '../constants';
import { NestedValueOf, Paths } from '../interfaces';

@Injectable()
export class EnvService<T extends Record<string, any> = Record<string, any>> {
  private readonly logger = new Logger(EnvService.name);

  constructor(@Inject(ENV_CONFIG) private readonly config: T) {}

  /**
   * Get a configuration value by path with type safety
   */
  get<K extends Paths<T, 3>>(path: K): NestedValueOf<T, K> {
    const value = this.getNestedValue(this.config, path as string);

    if (value === undefined) {
      this.logger.warn(`Configuration value not found for path: ${path}`);
    }

    return value as NestedValueOf<T, K>;
  }

  /**
   * Get a configuration value with a fallback default
   */
  getOrDefault<K extends Paths<T, 3>>(path: K, defaultValue: NestedValueOf<T, K>): NestedValueOf<T, K> {
    const value = this.get(path);

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a configuration path exists
   */
  has<K extends Paths<T, 3>>(path: K): boolean {
    return this.getNestedValue(this.config, path as string) !== undefined;
  }

  /**
   * Get multiple configuration values at once
   */
  getMany<K extends Paths<T, 3>>(paths: readonly K[]): Record<K, NestedValueOf<T, K>> {
    const result = {} as Record<K, NestedValueOf<T, K>>;

    for (const path of paths) {
      result[path] = this.get(path);
    }

    return result;
  }

  /**
   * Get all configuration as a plain object
   */
  getAll(): T {
    return this.config;
  }

  /**
   * Get a configuration value and validate it's not undefined or null
   */
  getRequired<K extends Paths<T, 3>>(path: K): NonNullable<NestedValueOf<T, K>> {
    const value = this.get(path);

    if (value === undefined || value === null) {
      throw new Error(`Required configuration value is missing or null: ${path}`);
    }

    return value as NonNullable<NestedValueOf<T, K>>;
  }

  /**
   * Get configuration value parsed as specific type
   */
  getParsed<K extends Paths<T, 3>, R = any>(path: K, parser: (value: NestedValueOf<T, K>) => R): R {
    const value = this.get(path);

    try {
      return parser(value);
    } catch (error: any) {
      throw new Error(`Configuration parsing failed for ${path}: ${error.message}`, { cause: error });
    }
  }

  getNumber<K extends Paths<T, 3>>(path: K): number {
    return this.getParsed(path, (value) => {
      const num = Number(value);

      if (isNaN(num)) {
        throw new Error(`Value is not a valid number: ${value}`);
      }

      return num;
    });
  }

  getBoolean<K extends Paths<T, 3>>(path: K): boolean {
    return this.getParsed(path, (value) => {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const lower = value.toLowerCase();

        if (lower === 'true' || lower === '1') {
          return true;
        }

        if (lower === 'false' || lower === '0') {
          return false;
        }
      }

      throw new Error(`Value is not a valid boolean: ${value}`);
    });
  }

  getArray<K extends Paths<T, 3>>(path: K, delimiter = ','): string[] {
    return this.getParsed(path, (value) => {
      if (Array.isArray(value)) {
        return value.map(String);
      }

      if (typeof value === 'string') {
        return value.split(delimiter).map((s) => s.trim());
      }

      throw new Error(`Value is not a valid array: ${value}`);
    });
  }

  getUrl<K extends Paths<T, 3>>(path: K): URL {
    return this.getParsed(path, (value) => {
      try {
        return new URL(String(value));
      } catch {
        throw new Error(`Value is not a valid URL: ${value}`);
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
