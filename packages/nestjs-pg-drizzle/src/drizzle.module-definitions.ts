import { ConfigurableModuleBuilder } from '@nestjs/common';
import { TablesRelationalConfig } from 'drizzle-orm/relations';

export type DrizzleConfig = {
  host: string;
  database: string;
  user: string;
  port: number;
  password: string;
};

export type DrizzleModuleOptions = DrizzleConfig & {
  relations?: TablesRelationalConfig;
  logger?: boolean;
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
