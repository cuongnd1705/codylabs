import type { RedisClientLike, RedlockOptions } from '@codylabs/redlock';

/**
 * Redis module configuration options.
 * Contains Redis clients array and lock-specific configuration.
 */
export interface RedlockModuleOptions {
  /** Array of independent Redis clients for distributed locking (not replicas). Accepts standard client, cluster, or sentinel. */
  clients: RedisClientLike[];

  /** Lock configuration options */
  redlockConfig?: RedlockOptions;
}

/**
 * Factory interface for creating Redis options
 */
export interface RedlockOptionsFactory {
  createRedlockOptions(): Promise<RedlockModuleOptions> | RedlockModuleOptions;
}
