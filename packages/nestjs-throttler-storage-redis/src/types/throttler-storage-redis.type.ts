import type { RedisClientType, RedisClusterType, RedisFunctions, RedisModules, RedisScripts } from 'redis';

export type RedisClientConnectionType = RedisClientType | RedisClusterType<RedisModules, RedisFunctions, RedisScripts>;

export type RedisOptions = {
  /**
   * Namespace for the current instance.
   */
  namespace?: string;

  /**
   * Separator to use between namespace and key.
   */
  keyPrefixSeparator?: string;

  /**
   * Close the connection after the module is destroyed.
   */
  closeAfterDestroyed?: boolean;
};

export const ThrottlerStorageRedis = Symbol('ThrottlerStorageRedis');
