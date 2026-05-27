import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';

/**
 * A Redis client compatible with Redlock: standard client, cluster, or sentinel.
 */
export type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

/**
 * Configuration options for Redlock distributed locking.
 */
export interface RedlockOptions {
  /** Clock drift compensation factor (default: 0.01) */
  driftFactor?: number;

  /** Base retry delay in milliseconds (default: 200) */
  retryDelayMs?: number;

  /** Random jitter added to retry delay (default: 100) */
  retryJitterMs?: number;

  /** Maximum retry attempts (default: 3). Use -1 for unlimited retries. */
  maxRetryAttempts?: number;
}

/**
 * Per-call retry options that override the instance-level defaults for a single acquire.
 */
export type AcquireOptions = Pick<RedlockOptions, 'retryDelayMs' | 'retryJitterMs' | 'maxRetryAttempts'>;

/**
 * Options for withLock, combining per-call retry overrides with auto-extension config.
 */
export type WithLockOptions = AcquireOptions & {
  /** Threshold in milliseconds before lock expiration to trigger auto-extension */
  extensionThresholdMs?: number;
};
