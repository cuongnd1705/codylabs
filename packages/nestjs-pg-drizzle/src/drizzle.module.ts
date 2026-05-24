import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getDrizzleInstanceToken, getDrizzlePoolToken } from './constants';
import { ConfigurableModuleClass, DrizzleModuleOptions, MODULE_OPTIONS_TOKEN } from './drizzle.module-definitions';

@Global()
@Module({
  providers: [
    {
      provide: getDrizzlePoolToken(),
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: ({
        host,
        port,
        user,
        password,
        database,
        max,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        ssl,
      }: DrizzleModuleOptions) => {
        return new Pool({
          host,
          port,
          user,
          password,
          database,
          max,
          idleTimeoutMillis,
          connectionTimeoutMillis,
          ssl,
        });
      },
    },
    {
      provide: getDrizzleInstanceToken(),
      inject: [MODULE_OPTIONS_TOKEN, getDrizzlePoolToken()],
      useFactory: async ({ relations, logger }: DrizzleModuleOptions, pool: Pool) => {
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
export class DrizzleModule extends ConfigurableModuleClass implements OnModuleDestroy {
  constructor(@Inject(getDrizzlePoolToken()) private readonly pool: Pool) {
    super();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
