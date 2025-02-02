import { FactoryProvider, Provider, ValueProvider } from '@nestjs/common';
import {
  RedisClientOptions,
  RedisClientType,
  RedisClusterOptions,
  RedisClusterType,
  createClient,
  createCluster,
} from 'redis';

import {
  DEFAULT_REDIS_NAMESPACE,
  NAMESPACE_KEY,
  REDIS_CLIENTS,
  REDIS_MERGED_OPTIONS,
  REDIS_OPTIONS,
} from '../constants';
import { RedisClientOpts, RedisModuleAsyncOptions, RedisModuleOptions, RedisOptionsFactory } from '../interfaces';
import { RedisClientConnectionType, RedisClients } from '../types';

const createRedisClient = async ({
  namespace,
  onClientCreated,
  ...redisOptions
}: RedisClientOpts): Promise<RedisClientConnectionType> => {
  const client =
    (redisOptions as any).rootNodes === undefined
      ? (createClient(redisOptions as RedisClientOptions) as RedisClientType)
      : (createCluster(redisOptions as RedisClusterOptions) as RedisClusterType);

  Reflect.defineProperty(client, NAMESPACE_KEY, {
    value: namespace ?? DEFAULT_REDIS_NAMESPACE,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  if (!client.isOpen) {
    await client.connect();
  }

  if (onClientCreated) {
    onClientCreated(client);
  }

  return client;
};

export const createOptionsProvider = (options: RedisModuleOptions): ValueProvider<RedisModuleOptions> => ({
  provide: REDIS_OPTIONS,
  useValue: options,
});

export const createAsyncProviders = (options: RedisModuleAsyncOptions): Provider[] => {
  if (options.useClass) {
    return [
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
      createAsyncOptionsProvider(options),
    ];
  }

  if (options.useExisting || options.useFactory) return [createAsyncOptionsProvider(options)];

  return [];
};

export const createAsyncOptions = async (optionsFactory: RedisOptionsFactory): Promise<RedisModuleOptions> => {
  return await optionsFactory.createRedisOptions();
};

export const createAsyncOptionsProvider = (options: RedisModuleAsyncOptions): Provider => {
  if (options.useFactory) {
    return {
      provide: REDIS_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject,
    };
  }

  if (options.useClass) {
    return {
      provide: REDIS_OPTIONS,
      useFactory: createAsyncOptions,
      inject: [options.useClass],
    };
  }

  if (options.useExisting) {
    return {
      provide: REDIS_OPTIONS,
      useFactory: createAsyncOptions,
      inject: [options.useExisting],
    };
  }

  return {
    provide: REDIS_OPTIONS,
    useValue: {},
  };
};

export const redisClientsProvider: FactoryProvider<RedisClients> = {
  provide: REDIS_CLIENTS,
  useFactory: async (options: RedisModuleOptions) => {
    const clients: RedisClients = new Map();

    if (Array.isArray(options.clientConfigurations)) {
      for (const clientConfiguration of options.clientConfigurations) {
        const namespace = clientConfiguration.namespace ?? DEFAULT_REDIS_NAMESPACE;
        const client = await createRedisClient({
          ...options.sharedOptions,
          ...clientConfiguration,
        });

        clients.set(namespace, client);
      }
    } else if (options.clientConfigurations) {
      const namespace = options.clientConfigurations.namespace ?? DEFAULT_REDIS_NAMESPACE;
      const client = await createRedisClient(options.clientConfigurations);

      clients.set(namespace, client);
    }

    return clients;
  },
  inject: [REDIS_MERGED_OPTIONS],
};

export const mergedOptionsProvider: FactoryProvider<RedisModuleOptions> = {
  provide: REDIS_MERGED_OPTIONS,
  useFactory: (options: RedisModuleOptions): RedisModuleOptions => ({
    closeAfterShutdown: true,
    sharedOptions: undefined,
    clientConfigurations: {},
    ...options,
  }),
  inject: [REDIS_OPTIONS],
};
