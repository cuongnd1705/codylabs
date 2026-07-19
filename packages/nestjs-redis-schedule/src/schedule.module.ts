import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';

import { SCHEDULE_MODULE_OPTIONS } from './constants';
import { ScheduleExplorer, SchedulerMetadataAccessor, SchedulerOrchestrator, SchedulerRegistry } from './core';
import { ScheduleModuleAsyncOptions, ScheduleModuleOptions, ScheduleModuleOptionsFactory } from './interfaces';
import { RedisJobStore, RedisPollLoop } from './redis';

const CORE_PROVIDERS: Type[] = [
  SchedulerMetadataAccessor,
  RedisJobStore,
  RedisPollLoop,
  SchedulerRegistry,
  SchedulerOrchestrator,
  ScheduleExplorer,
];

@Module({})
export class ScheduleModule {
  static forRoot(options: ScheduleModuleOptions): DynamicModule {
    const resolvedOptions = this.resolveOptions(options);
    return {
      global: true,
      module: ScheduleModule,
      imports: [DiscoveryModule],
      providers: [{ provide: SCHEDULE_MODULE_OPTIONS, useValue: resolvedOptions }, Reflector, ...CORE_PROVIDERS],
      exports: [SchedulerRegistry],
    };
  }

  static forRootAsync(options: ScheduleModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      module: ScheduleModule,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [...this.createAsyncProviders(options), Reflector, ...CORE_PROVIDERS],
      exports: [SchedulerRegistry],
    };
  }

  private static createAsyncProviders(options: ScheduleModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ScheduleModuleOptionsFactory>;
    return [this.createAsyncOptionsProvider(options), { provide: useClass, useClass }];
  }

  private static createAsyncOptionsProvider(options: ScheduleModuleAsyncOptions): Provider {
    if (options.useFactory) {
      const factory = options.useFactory;
      return {
        provide: SCHEDULE_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          return this.resolveOptions(config);
        },
        inject: (options.inject ?? []) as never[],
      };
    }
    const inject = [(options.useClass ?? options.useExisting) as Type<ScheduleModuleOptionsFactory>];
    return {
      provide: SCHEDULE_MODULE_OPTIONS,
      useFactory: async (factory: ScheduleModuleOptionsFactory) => {
        const config = await factory.createScheduleOptions();
        return this.resolveOptions(config);
      },
      inject,
    };
  }

  private static resolveOptions(options: ScheduleModuleOptions): ScheduleModuleOptions {
    const resolved: ScheduleModuleOptions = {
      cronJobs: true,
      intervals: true,
      timeouts: true,
      executionMode: 'at-most-once',
      leaseDuration: 30_000,
      maxRetries: 3,
      ...options,
    };

    if (!Number.isSafeInteger(resolved.leaseDuration) || resolved.leaseDuration! <= 0) {
      throw new Error('ScheduleModule leaseDuration must be a positive integer');
    }
    if (!Number.isSafeInteger(resolved.maxRetries) || resolved.maxRetries! < 0) {
      throw new Error('ScheduleModule maxRetries must be a non-negative integer');
    }

    return resolved;
  }
}
