import type { RedisClientType, RedisClusterType, RedisFunctions, RedisModules, RedisScripts } from 'redis';

export type Namespace = string | Symbol;

export type RedisClientConnectionType = RedisClientType | RedisClusterType<RedisModules, RedisFunctions, RedisScripts>;

export type RedisClients = Map<Namespace, RedisClientConnectionType>;
