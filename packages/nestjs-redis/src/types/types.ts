import type {
  RedisClientOptions,
  RedisClusterOptions,
  RedisSentinelOptions,
  createClient,
  createCluster,
  createSentinel,
} from 'redis';

export type RedisInstance =
  | ReturnType<typeof createClient>
  | ReturnType<typeof createCluster>
  | ReturnType<typeof createSentinel>;

/**
 * A custom logger interface compatible with NestJS LoggerService.
 */
export interface RedisLogger {
  log(message: string, ...optionalParams: any[]): void;
  error(message: string, ...optionalParams: any[]): void;
  warn(message: string, ...optionalParams: any[]): void;
}

export type RedisOptions = RedisClientOptions | RedisClusterOptions | RedisSentinelOptions;

export type RedisConnectionConfig =
  | {
      type?: 'client';
      options?: RedisClientOptions;
    }
  | {
      type: 'cluster';
      options: RedisClusterOptions;
    }
  | {
      type: 'sentinel';
      options: RedisSentinelOptions;
    };

/**
 * Redis module configuration options.
 * This only contains the Redis connection configuration, not module-level concerns.
 * Used by useFactory in forRootAsync.
 */
export type RedisModuleOptions = RedisConnectionConfig;

/**
 * Options for forRoot method that include both Redis configuration and module-level options.
 */
export type RedisModuleForRootOptions = RedisModuleOptions & {
  /**
   * If "true", register `RedisModule` as a global module.
   */
  isGlobal?: boolean;

  /**
   * The name of the connection. Used to create multiple named connections.
   */
  connectionName?: string;

  /**
   * Configure logging behavior.
   * - `true` (default): use the built-in NestJS logger
   * - `false`: disable all logging
   * - `RedisLogger`: use a custom logger instance
   */
  logger?: boolean | RedisLogger;
};
