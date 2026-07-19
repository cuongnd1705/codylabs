import type { ModuleMetadata, Type } from '@nestjs/common';
import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

export interface ScheduleModuleOptions {
  client: RedisClientLike;
  keyPrefix?: string;
  shutdownTimeout?: number;
  /**
   * `at-most-once` preserves the original destructive-claim behavior.
   * `at-least-once` keeps claimed executions under a renewable Redis lease and retries failures.
   * @default 'at-most-once'
   */
  executionMode?: 'at-most-once' | 'at-least-once';
  /** Duration of a claimed execution lease in milliseconds. @default 30000 */
  leaseDuration?: number;
  /** Number of retries after the first failed or interrupted execution. @default 3 */
  maxRetries?: number;
  cronJobs?: boolean;
  intervals?: boolean;
  timeouts?: boolean;
}

export interface ScheduleModuleOptionsFactory {
  createScheduleOptions(): Promise<ScheduleModuleOptions> | ScheduleModuleOptions;
}

export interface ScheduleModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ScheduleModuleOptionsFactory>;
  useClass?: Type<ScheduleModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<ScheduleModuleOptions> | ScheduleModuleOptions;
  inject?: any[];
}
