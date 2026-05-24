import { ConfigurableModuleBuilder } from '@nestjs/common';
import { type Logger } from 'drizzle-orm';
import { TablesRelationalConfig } from 'drizzle-orm/relations';

export type { ConsoleLogWriter, DefaultLogger, LogWriter, Logger } from 'drizzle-orm';

export type DrizzleConfig = {
  host: string;
  database: string;
  user: string;
  port: number;
  password: string;
};

export type DrizzlePoolConfig = {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
};

export type DrizzleModuleOptions = DrizzleConfig &
  DrizzlePoolConfig & {
    relations?: TablesRelationalConfig;
    logger?: boolean | Logger;
  };

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, ASYNC_OPTIONS_TYPE, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<DrizzleModuleOptions>()
    .setClassMethodName('forRoot')
    .setExtras(
      {
        isGlobal: true,
      },
      (definition, extras) => ({
        global: extras.isGlobal,
        ...definition,
      }),
    )
    .build();
