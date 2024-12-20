import { InjectionToken, ModuleMetadata, OptionalFactoryDependency, Provider, Type } from '@nestjs/common';
import { RedisClientOptions, RedisClusterOptions } from 'redis';

import { Namespace, RedisClientConnectionType } from '../types';

export interface RedisClientOpts extends RedisClientOptions {
  /**
   * Client name. If client name is not given then it will be called "default".
   * Different clients must have different names.
   *
   * @defaultValue `"default"`
   */
  namespace?: Namespace;

  /**
   * Function to be executed as soon as the client is created.
   *
   * @param client - The new client created
   */
  onClientCreated?: (client: RedisClientConnectionType) => void;
}

export interface RedisClusterOpts extends RedisClusterOptions {
  /**
   * Client name. If client name is not given then it will be called "default".
   * Different clients must have different names.
   *
   * @defaultValue `"default"`
   */
  namespace?: Namespace;

  /**
   * Function to be executed as soon as the client is created.
   *
   * @param client - The new client created
   */
  onClientCreated?: (client: RedisClientConnectionType) => void;
}

export interface RedisModuleOptions {
  /**
   * If set to `true`, all clients will be closed automatically on nestjs application shutdown.
   *
   * @defaultValue `true`
   */
  closeAfterShutdown?: boolean;

  /**
   * Share options to be passed to each client.
   */
  sharedOptions?: RedisClientOptions | RedisClusterOptions;

  /**
   * Used to specify single or multiple clients.
   */
  clientConfigurations?: RedisClientOpts | RedisClusterOpts | (RedisClientOpts | RedisClusterOpts)[];
}

export interface RedisModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => RedisModuleOptions | Promise<RedisModuleOptions>;
  useClass?: Type<RedisOptionsFactory>;
  useExisting?: Type<RedisOptionsFactory>;
  inject?: InjectionToken[] | OptionalFactoryDependency[];
  extraProviders?: Provider[];
}

export interface RedisOptionsFactory {
  createRedisOptions: () => RedisModuleOptions | Promise<RedisModuleOptions>;
}
