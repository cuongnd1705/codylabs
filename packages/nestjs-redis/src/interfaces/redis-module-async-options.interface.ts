import { ConfigurableModuleAsyncOptions } from '@nestjs/common';

import { RedisLogger, RedisModuleOptions } from '../types';
import { RedisOptionsFactory } from './redis-options-factory.interface';

/**
 * Options for dynamically configuring the Redis module.
 */
export interface RedisModuleAsyncOptions extends ConfigurableModuleAsyncOptions<
  RedisModuleOptions,
  keyof RedisOptionsFactory
> {
  /**
   * If "true", register `RedisModule` as a global module.
   */
  isGlobal?: boolean;

  /**
   * The name of the connection. Used to create multiple named connections.
   */
  connectionName?: string;

  /**
   * Configure logging behavior.
   * - `true` (default): use the built-in NestJS logger
   * - `false`: disable all logging
   * - `RedisLogger`: use a custom logger instance
   */
  logger?: boolean | RedisLogger;
}
