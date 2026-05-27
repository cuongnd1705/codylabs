import { Module } from '@nestjs/common';

import type { RedlockModuleOptions } from './interfaces';

import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './redlock.module-definition';
import { RedlockService } from './services';

@Module({
  providers: [
    {
      inject: [MODULE_OPTIONS_TOKEN],
      provide: RedlockService,
      useFactory: (options: RedlockModuleOptions) => new RedlockService(options.clients, options.redlockConfig),
    },
  ],
  exports: [RedlockService],
})
export class RedlockModule extends ConfigurableModuleClass {}
