/**
 * Lightweight health indicator abstraction, adapted from @nestjs/terminus
 * to avoid a hard dependency on it.
 */

/**
 * @publicApi
 */
export type HealthIndicatorStatus = 'up' | 'down';

/**
 * The result object of a health indicator
 * @publicApi
 */
export type HealthIndicatorResult<
  Key extends string = string,
  Status extends HealthIndicatorStatus = HealthIndicatorStatus,
  OptionalData extends Record<string, any> = Record<string, any>,
> = Record<Key, { status: Status } & OptionalData>;

type AdditionalData = Record<string, unknown>;

/**
 * Indicate the health of a health indicator with the given key
 *
 * @publicApi
 */
export class HealthIndicatorSession<Key extends Readonly<string> = string> {
  constructor(private readonly key: Key) {}

  /**
   * Mark the health indicator as `down`
   * @param data additional data which will get appended to the result object
   */
  down<T extends AdditionalData>(data?: T): HealthIndicatorResult<typeof this.key, 'down', T>;
  down<T extends string>(data?: T): HealthIndicatorResult<typeof this.key, 'down', { message: T }>;
  down<T extends AdditionalData | string>(data?: T): HealthIndicatorResult<typeof this.key, 'down'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    const detail = {
      status: 'down' as const,
      ...additionalData,
    };

    return {
      [this.key]: detail,
    } as Record<Key, typeof detail>;
  }

  /**
   * Mark the health indicator as `up`
   * @param data additional data which will get appended to the result object
   */
  up<T extends AdditionalData>(data?: T): HealthIndicatorResult<Key, 'up', T>;
  up<T extends string>(data?: T): HealthIndicatorResult<Key, 'up', { message: T }>;
  up<T extends AdditionalData | string>(data?: T): HealthIndicatorResult<Key, 'up'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    const detail = {
      status: 'up' as const,
      ...additionalData,
    };

    return {
      [this.key]: detail,
    } as Record<Key, typeof detail>;
  }
}
