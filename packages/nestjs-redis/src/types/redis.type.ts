import type { RedisClientType, RedisClusterType, RedisFunctions, RedisModules, RedisScripts } from 'redis';

export type Namespace = string | symbol;

export type RedisClientConnectionType = RedisClientType | RedisClusterType<RedisModules, RedisFunctions, RedisScripts>;

export type RedisClients = Map<Namespace, RedisClientConnectionType>;
