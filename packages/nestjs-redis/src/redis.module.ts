import { DynamicModule, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { REDIS_CLIENTS, REDIS_MERGED_OPTIONS } from './constants';
import { RedisModuleAsyncOptions, RedisModuleOptions } from './interfaces';
import { createAsyncProviders, createOptionsProvider, mergedOptionsProvider, redisClientsProvider } from './providers';
import { RedisService } from './services';
import { RedisClients } from './types';

@Module({})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  static forRoot(options: RedisModuleOptions = {}, isGlobal = true): DynamicModule {
    const providers: Provider[] = [
      createOptionsProvider(options),
      redisClientsProvider,
      mergedOptionsProvider,
      RedisService,
    ];

    return {
      global: isGlobal,
      module: RedisModule,
      providers,
      exports: [RedisService],
    };
  }

  static forRootAsync(options: RedisModuleAsyncOptions, isGlobal = true): DynamicModule {
    if (!options.useFactory && !options.useClass && !options.useExisting) {
      throw new Error(
        "Invalid configuration, at least one of 'useFactory', 'useClass' or 'useExisting' must be defined",
      );
    }

    const providers: Provider[] = [
      ...createAsyncProviders(options),
      redisClientsProvider,
      mergedOptionsProvider,
      RedisService,
      ...(options.extraProviders ?? []),
    ];

    return {
      global: isGlobal,
      module: RedisModule,
      imports: options.imports,
      providers,
      exports: [RedisService],
    };
  }

  async onApplicationShutdown() {
    const { closeAfterShutdown } = this.moduleRef.get<RedisModuleOptions>(REDIS_MERGED_OPTIONS, {
      strict: false,
    });

    if (!closeAfterShutdown) {
      return;
    }

    const clients = this.moduleRef.get<RedisClients>(REDIS_CLIENTS, {
      strict: false,
    });

    for (const [_, client] of clients) {
      if (!client.isOpen) {
        continue;
      }

      await client.disconnect();
    }
  }
}
