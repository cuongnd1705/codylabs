# @codylabs/nestjs-pg-drizzle

PostgreSQL module for NestJS using [Drizzle ORM](https://orm.drizzle.team/). Provides a configurable global module, an `@InjectDrizzle()` decorator, and an abstract `BaseRepository` with a rich set of query helpers.

## Installation

```bash
pnpm add @codylabs/nestjs-pg-drizzle drizzle-orm@rc pg
pnpm add -D @types/pg
```

## Peer dependencies

| Package          | Version                |
| ---------------- | ---------------------- |
| `@nestjs/common` | `^10.0.0 \|\| ^11.0.0` |
| `@nestjs/core`   | `^10.0.0 \|\| ^11.0.0` |
| `drizzle-orm`    | `>=1.0.0-0`            |
| `pg`             | `^8.0.0`               |
| `@types/pg`      | `^8.0.0`               |

## Quick start

### 1. Register the module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DrizzleModule } from '@codylabs/nestjs-pg-drizzle';
import * as relations from './db/relations';

@Module({
  imports: [
    DrizzleModule.forRoot({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'secret',
      database: 'mydb',
      relations, // optional — your Drizzle relations object
      logger: true, // optional — log SQL queries
    }),
  ],
})
export class AppModule {}
```

You can pass a custom logger that satisfies Drizzle's `Logger` interface (e.g. to route SQL queries through your app's logger):

```typescript
import { Logger } from '@codylabs/nestjs-pg-drizzle';

class MyLogger implements Logger {
  logQuery(query: string, params: unknown[]) {
    console.log('[SQL]', query, params);
  }
}

DrizzleModule.forRoot({
  host: 'localhost',
  // ...
  logger: new MyLogger(),
});
```

For async configuration (e.g. using `ConfigService`):

```typescript
DrizzleModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    user: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
  }),
});
```

### 2. Inject the database instance

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@codylabs/nestjs-pg-drizzle';
import { Database } from '@codylabs/nestjs-pg-drizzle';
import * as relations from './db/schema';

@Injectable()
export class UserService {
  constructor(@InjectDrizzle() private readonly db: Database<typeof relations>) {}

  findAll() {
    return this.db.query.users.findMany();
  }
}
```

## BaseRepository

`BaseRepository` is an abstract class that wraps a Drizzle table with a typed set of CRUD and pagination helpers. Extend it to create a repository for each table.

### Creating a repository

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository, InjectDrizzle, Database } from '@codylabs/nestjs-pg-drizzle';
import { usersTable } from './db/schema';
import * as relations from './db/schema';

@Injectable()
export class UsersRepository extends BaseRepository<
  typeof usersTable,
  typeof relations,
  'users' // table name key in the relations schema
> {
  constructor(@InjectDrizzle() db: Database<typeof relations>) {
    super(db, usersTable, 'users');
  }
}
```

Register the repository as a provider and inject it wherever needed.

### Available methods

#### Write operations

| Method                              | Description                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `insert(value, opts?)`              | Insert a single row; returns the inserted row or `null`                       |
| `insertMany(values, opts?)`         | Insert multiple rows                                                          |
| `update(value, opts?)`              | Update rows matching `where`; auto-sets `updateTime` when the column exists   |
| `delete(opts?)`                     | Hard-delete rows matching `where`                                             |
| `softDelete(opts?)`                 | Set `deleteTime = NOW()` instead of deleting (requires a `deleteTime` column) |
| `restore(opts?)`                    | Clear `deleteTime` to un-delete soft-deleted rows                             |
| `increment(column, amount?, opts?)` | Atomically increment a numeric column                                         |
| `decrement(column, amount?, opts?)` | Atomically decrement a numeric column                                         |

#### Read operations

| Method                    | Description                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| `findFirst(opts?)`        | Return the first matching row or `null`                                         |
| `findFirstOrFail(opts?)`  | Return the first matching row or throw `NotFoundException`                      |
| `findMany(opts?)`         | Return all matching rows                                                        |
| `paginateByOffset(opts?)` | Offset-based pagination — returns `{ data, total, page, pageSize, totalPages }` |
| `paginateByCursor(opts?)` | Cursor-based (keyset) pagination — returns `{ data, nextPageToken }`            |

#### Aggregation

| Method                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `exists(opts?)`          | `true` if at least one matching row exists |
| `count(opts?)`           | Number of matching rows                    |
| `sum(column, opts?)`     | Sum of a numeric column                    |
| `average(column, opts?)` | Average of a numeric column                |
| `minimum(column, opts?)` | Minimum value of a numeric column          |
| `maximum(column, opts?)` | Maximum value of a numeric column          |

All methods accept an optional `tx` option so they can participate in a Drizzle transaction.

### Soft delete

When the table has a `deleteTime` column, `findFirst`, `findFirstOrFail`, `findMany`, `paginateByOffset`, `paginateByCursor`, `count`, and `exists` automatically filter out soft-deleted rows. Pass `showDeleted: true` to include them.

> **Note:** Calling `softDelete()` on a table without a `deleteTime` column throws a `BadRequestException`.

```typescript
// Exclude soft-deleted rows (default)
await this.usersRepository.findMany({ where: { role: 'admin' } });

// Include soft-deleted rows
await this.usersRepository.findMany({ where: { role: 'admin' }, showDeleted: true });

// Soft-delete a user
await this.usersRepository.softDelete({ where: { id: userId } });

// Restore a soft-deleted user
await this.usersRepository.restore({ where: { id: userId } });
```

### Pagination

#### Offset-based

```typescript
const result = await this.usersRepository.paginateByOffset({
  page: 2,
  pageSize: 20,
  orderBy: 'createdAt:desc,id:asc',
  where: { role: 'admin' },
});
// result: { data: User[], total: number, page: number, pageSize: number, totalPages: number }
```

#### Cursor-based

```typescript
// First page
const first = await this.usersRepository.paginateByCursor({
  pageSize: 20,
  orderBy: 'createdAt:desc',
});
// first: { data: User[], nextPageToken: string | null }

// Subsequent pages
const next = await this.usersRepository.paginateByCursor({
  pageSize: 20,
  orderBy: 'createdAt:desc',
  pageToken: first.nextPageToken,
});
```

### Transactions

Use `withTransaction()` on any repository to start a transaction. All repository methods accept an optional `tx` option to participate in an existing transaction.

```typescript
await this.usersRepository.withTransaction(async (tx) => {
  await this.usersRepository.insert({ name: 'Alice' }, { tx });
  await this.postsRepository.insert({ authorId: userId, title: 'Hello' }, { tx });
});
```

You can also pass a transaction obtained elsewhere:

```typescript
import { Transaction } from '@codylabs/nestjs-pg-drizzle';
import * as relations from './db/schema';

await this.db.transaction(async (tx: Transaction<typeof relations>) => {
  await this.usersRepository.insert({ name: 'Alice' }, { tx });
  await this.postsRepository.insert({ authorId: userId, title: 'Hello' }, { tx });
});
```

### Lifecycle hooks

Override these protected methods in your repository subclass to add custom logic:

```typescript
export class UsersRepository extends BaseRepository<...> {
  protected async beforeInsert(row: PgInsertValue<typeof usersTable>) {
    // e.g. hash passwords before persisting
  }

  protected async afterInsert(row: InferSelectModel<typeof usersTable>) {
    // e.g. emit a domain event
  }

  protected async afterFind(row: InferSelectModel<typeof usersTable>) {
    // e.g. strip sensitive fields
  }

  protected async beforeUpdate(value: PgUpdateSetSource<typeof usersTable>) {
    // e.g. validate state transitions
  }

  protected async afterUpdate(row: InferSelectModel<typeof usersTable>) {
    // e.g. publish an updated event
  }

  protected async afterDelete(row: InferSelectModel<typeof usersTable>) {
    // e.g. publish a deleted event
  }
}
```

## API reference

### `DrizzleModuleOptions`

| Property                  | Type                     | Required | Description                                                                                |
| ------------------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `host`                    | `string`                 | ✓        | Database host                                                                              |
| `port`                    | `number`                 | ✓        | Database port                                                                              |
| `user`                    | `string`                 | ✓        | Database user                                                                              |
| `password`                | `string`                 | ✓        | Database password                                                                          |
| `database`                | `string`                 | ✓        | Database name                                                                              |
| `max`                     | `number`                 |          | Maximum number of pool connections (default: pg default)                                   |
| `idleTimeoutMillis`       | `number`                 |          | Milliseconds a client can sit idle before being closed                                     |
| `connectionTimeoutMillis` | `number`                 |          | Milliseconds to wait when acquiring a connection                                           |
| `ssl`                     | `boolean \| object`      |          | SSL configuration passed directly to `pg`                                                  |
| `relations`               | `TablesRelationalConfig` |          | Drizzle relations object — required for relational queries                                 |
| `logger`                  | `boolean \| Logger`      |          | Enable query logging (`true` = built-in console logger) or pass a custom `Logger` instance |

### `BaseRepository` constructor

```typescript
constructor(db: Database<TSchema>, table: PgTable, tableName: keyof TSchema)
```

## License

MIT
