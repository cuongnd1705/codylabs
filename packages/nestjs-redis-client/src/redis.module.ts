import { DynamicModule, FactoryProvider, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createClient, createCluster, createSentinel } from 'redis';

import { RedisToken } from './constants';
import { RedisModuleAsyncOptions } from './interfaces';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './redis.module-definition';
import { RedisModuleForRootOptions, RedisModuleOptions } from './types';

type RedisInstance =
  | ReturnType<typeof createClient>
  | ReturnType<typeof createCluster>
  | ReturnType<typeof createSentinel>;

@Module({})
export class RedisModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  private static readonly logger = new Logger('RedisModule');

  protected connectionName?: string;

  constructor(private moduleRef: ModuleRef) {
    super();
  }

  public static forRoot(options: RedisModuleForRootOptions = {}): DynamicModule {
    const baseModule = super.forRoot(options);

    return {
      global: options?.isGlobal ?? false,
      module: class extends RedisModule {
        override connectionName = options?.connectionName;
      },
      providers: [...(baseModule.providers || []), this.getRedisClientProvider(options?.connectionName)],
      exports: [RedisToken(options?.connectionName)],
    };
  }

  public static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const baseModule = super.forRootAsync(options);

    return {
      global: options.isGlobal ?? false,
      module: class extends RedisModule {
        override connectionName = options.connectionName;
      },
      imports: options.imports || [],
      providers: [...(baseModule.providers || []), this.getRedisClientProvider(options.connectionName)],
      exports: [RedisToken(options.connectionName)],
    };
  }

  private static getRedisClientProvider(connectionName?: string): FactoryProvider {
    return {
      inject: [MODULE_OPTIONS_TOKEN],
      provide: RedisToken(connectionName),
      useFactory: async (config: RedisModuleOptions): Promise<RedisInstance> => {
        function getClient(): RedisInstance {
          switch (config?.type) {
            case 'client':
            case undefined:
              return createClient(config?.options);
            case 'cluster':
              return createCluster(config.options);
            case 'sentinel':
              return createSentinel(config.options);
            default:
              throw new Error(
                // @ts-expect-error check for config type
                `Unsupported Redis type: ${config?.type}. Supported types are 'client', 'cluster' and 'sentinel'`,
              );
          }
        }

        function addListeners(client: RedisInstance, redisConnectionName?: string): void {
          client.on('connect', () => {
            RedisModule.log(`[Event=connect] Connection initiated to Redis server`, redisConnectionName);
          });

          client.on('ready', () => {
            RedisModule.log(`[Event=ready] Redis client is ready to accept commands`, redisConnectionName);
          });

          client.on('end', () => {
            RedisModule.log(`[Event=end] Connection closed (disconnected from Redis server)`, redisConnectionName);
          });

          client.on('reconnecting', () => {
            RedisModule.log(`[Event=reconnecting] Attempting to reconnect to Redis server`, redisConnectionName);
          });

          client.on('error', (err) => {
            RedisModule.err(
              `[Event=error] Redis connection error (network issue): ${err.message}`,
              redisConnectionName,
            );
          });
        }

        RedisModule.log(`Creating Redis client...`, connectionName);

        const client = getClient();
        addListeners(client, connectionName);

        RedisModule.log(`Connecting to Redis...`, connectionName);

        await client.connect();

        RedisModule.log(`Redis client connected`, connectionName);

        return client;
      },
    };
  }

  async onApplicationShutdown() {
    RedisModule.log(`Closing Redis connection...`, this.connectionName);

    await this.moduleRef.get<RedisInstance>(RedisToken(this.connectionName)).quit();

    RedisModule.log(`Redis connection closed`, this.connectionName);
  }

  private static log(message: string, connectionName: string | undefined = '<empty>'): void {
    if (process.env['REDIS_MODULE_DEBUG'] !== 'true') {
      return;
    }

    this.logger.log(`[Connection=${connectionName}]: ${message}`);
  }

  private static err(message: string, connectionName: string | undefined = '<empty>'): void {
    if (process.env['REDIS_MODULE_DEBUG'] !== 'true') {
      return;
    }

    this.logger.error(`[Connection=${connectionName}]: ${message}`);
  }
}
