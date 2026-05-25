import type { RedisClientType } from 'redis';

import { Module } from '@nestjs/common';

import type { RedlockModuleOptions } from './interfaces/redlock.interface';

import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './redlock.module-definition';
import { RedlockService } from './services/redlock.service';

@Module({
  providers: [
    {
      inject: [MODULE_OPTIONS_TOKEN],
      provide: RedlockService,
      useFactory: (options: RedlockModuleOptions) =>
        new RedlockService(options.clients as RedisClientType[], options.redlockConfig),
    },
  ],
  exports: [RedlockService],
})
export class RedlockModule extends ConfigurableModuleClass {}
