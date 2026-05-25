# @codylabs/nestjs-redis-schedule

Drop-in replacement for `@nestjs/schedule` with Redis-backed distributed cron execution.

## Features

- Drop-in replacement - Same `@Cron`, `@Interval`, `@Timeout` decorators and other APIs as `@nestjs/schedule`
- Distributed cron execution - Redis locking guarantees a job fires on exactly one instance per tick
- Redis persistence for cron jobs - schedules survive process restarts
- Works with existing `@codylabs/nestjs-redis-client` connections

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-schedule @codylabs/nestjs-redis-client redis

# pnpm
pnpm add @codylabs/nestjs-redis-schedule @codylabs/nestjs-redis-client redis
```

## Usage

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@codylabs/nestjs-redis-client';
import { ScheduleModule } from '@codylabs/nestjs-redis-schedule';

@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    ScheduleModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (client) => ({ client }),
    }),
  ],
})
export class AppModule {}
```

### Cron Jobs

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@codylabs/nestjs-redis-schedule';

@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    // runs on exactly one instance per tick, even with many replicas
  }
}
```

## Migrating from `@nestjs/schedule`

1. Swap the import:

```diff
-import { ScheduleModule, Cron } from '@nestjs/schedule';
+import { ScheduleModule, Cron } from '@codylabs/nestjs-redis-schedule';
```

2. Pass a Redis client:

```diff
-ScheduleModule.forRoot()
+ScheduleModule.forRootAsync({
+  inject: [RedisToken()],
+  useFactory: (client) => ({ client }),
+})
```

For full API documentation refer to the [official `@nestjs/schedule` docs](https://docs.nestjs.com/techniques/task-scheduling).

> **Note:** `@Interval` and `@Timeout` use native Node.js timers and run on every instance, identical to `@nestjs/schedule`. Only `@Cron` jobs are distributed via Redis.

## License

MIT
