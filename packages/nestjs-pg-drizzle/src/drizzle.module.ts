import { Global, Module } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getDrizzleInstanceToken } from './constants';
import { ConfigurableModuleClass, DrizzleModuleOptions, MODULE_OPTIONS_TOKEN } from './drizzle.module-definitions';

@Global()
@Module({
  providers: [
    {
      provide: getDrizzleInstanceToken(),
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: async ({ database, host, password, user, port, relations, logger }: DrizzleModuleOptions) => {
        const pool = new Pool({ host, port, user, password, database });

        const db = drizzle({
          client: pool,
          logger: logger ?? false,
          ...(relations ? { relations } : {}),
        });

        await db.execute(sql`SELECT 1`);

        return db;
      },
    },
  ],
  exports: [getDrizzleInstanceToken()],
})
export class DrizzleModule extends ConfigurableModuleClass {}
