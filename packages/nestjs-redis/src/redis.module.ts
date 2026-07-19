import { DynamicModule, FactoryProvider, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createClient, createCluster, createSentinel } from 'redis';

import { RedisToken } from './constants';
import { RedisModuleAsyncOptions } from './interfaces';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './redis.module-definition';
import { RedisInstance, RedisLogger, RedisModuleForRootOptions, RedisModuleOptions } from './types';

const noopLogger: RedisLogger = {
  log() {},
  error() {},
  warn() {},
};

@Module({})
export class RedisModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  private static readonly defaultLogger = new Logger('RedisModule');

  protected connectionName?: string;
  protected connectionLogger: RedisLogger = RedisModule.defaultLogger;

  constructor(private moduleRef: ModuleRef) {
    super();
  }

  private static resolveLogger(logger?: boolean | RedisLogger): RedisLogger {
    if (logger === false) {
      return noopLogger;
    }

    if (typeof logger === 'object') {
      return logger;
    }

    return RedisModule.defaultLogger;
  }

  public static forRoot(options: RedisModuleForRootOptions = {}): DynamicModule {
    const baseModule = super.forRoot(options);
    const connectionName = options?.connectionName;
    const logger = this.resolveLogger(options?.logger);

    return {
      global: options?.isGlobal ?? false,
      module: this.createNamedModule(connectionName, logger),
      providers: [...(baseModule.providers || []), this.getRedisClientProvider(connectionName, logger)],
      exports: [RedisToken(connectionName)],
    };
  }

  public static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const baseModule = super.forRootAsync(options);
    const connectionName = options.connectionName;
    const logger = this.resolveLogger(options.logger);

    return {
      global: options.isGlobal ?? false,
      module: this.createNamedModule(connectionName, logger),
      imports: options.imports || [],
      providers: [...(baseModule.providers || []), this.getRedisClientProvider(connectionName, logger)],
      exports: [RedisToken(connectionName)],
    };
  }

  public static forFeature(connectionName?: string): DynamicModule {
    return {
      module: RedisModule,
      exports: [RedisToken(connectionName)],
    };
  }

  private static createNamedModule(connectionName: string | undefined, logger: RedisLogger): typeof RedisModule {
    const NamedModule = class extends RedisModule {
      override connectionName = connectionName;
      override connectionLogger = logger;
    };

    Object.defineProperty(NamedModule, 'name', {
      value: `RedisModule_${connectionName || 'default'}`,
    });

    return NamedModule;
  }

  private static getRedisClientProvider(connectionName: string | undefined, logger: RedisLogger): FactoryProvider {
    return {
      inject: [MODULE_OPTIONS_TOKEN],
      provide: RedisToken(connectionName),
      useFactory: async (config: RedisModuleOptions): Promise<RedisInstance> => {
        function getClient(): RedisInstance {
          const type = config?.type;

          switch (type) {
            case 'client':
            case undefined:
              return createClient(config?.options);
            case 'cluster':
              return createCluster(config.options);
            case 'sentinel':
              return createSentinel(config.options);
            default:
              throw new Error(
                `Unsupported Redis type: ${type}. Supported types are 'client', 'cluster' and 'sentinel'`,
              );
          }
        }

        function addListeners(client: RedisInstance, redisConnectionName?: string): void {
          client.on('connect', () => {
            RedisModule.log(logger, `[Event=connect] Connection initiated to Redis server`, redisConnectionName);
          });

          client.on('ready', () => {
            RedisModule.log(logger, `[Event=ready] Redis client is ready to accept commands`, redisConnectionName);
          });

          client.on('end', () => {
            RedisModule.log(
              logger,
              `[Event=end] Connection closed (disconnected from Redis server)`,
              redisConnectionName,
            );
          });

          client.on('reconnecting', () => {
            RedisModule.log(
              logger,
              `[Event=reconnecting] Attempting to reconnect to Redis server`,
              redisConnectionName,
            );
          });

          client.on('error', (err) => {
            RedisModule.err(
              logger,
              `[Event=error] Redis connection error (network issue): ${err.message}`,
              redisConnectionName,
            );
          });
        }

        RedisModule.log(logger, `Creating Redis client...`, connectionName);

        const client = getClient();
        addListeners(client, connectionName);

        RedisModule.log(logger, `Connecting to Redis...`, connectionName);

        await client.connect();

        RedisModule.log(logger, `Redis client connected`, connectionName);

        return client;
      },
    };
  }

  async onApplicationShutdown() {
    RedisModule.log(this.connectionLogger, `Closing Redis connection...`, this.connectionName);

    try {
      await this.moduleRef.get<RedisInstance>(RedisToken(this.connectionName)).quit();
      RedisModule.log(this.connectionLogger, `Redis connection closed`, this.connectionName);
    } catch (error) {
      this.connectionLogger.warn(
        `[Connection=${this.connectionName || '<empty>'}]: Failed to close Redis connection: ${error}`,
      );
    }
  }

  private static log(logger: RedisLogger, message: string, connectionName: string | undefined = '<empty>'): void {
    logger.log(`[Connection=${connectionName}]: ${message}`);
  }

  private static err(logger: RedisLogger, message: string, connectionName: string | undefined = '<empty>'): void {
    logger.error(`[Connection=${connectionName}]: ${message}`);
  }
}
