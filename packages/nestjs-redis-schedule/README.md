# @codylabs/nestjs-redis-schedule

Drop-in replacement for `@nestjs/schedule` with Redis-backed distributed cron execution.

## Features

- **Drop-in replacement** — same `@Cron`, `@Interval`, `@Timeout` decorators and `SchedulerRegistry` API as `@nestjs/schedule`
- **Distributed cron execution** — Redis ZSET + atomic Lua script guarantees exactly one instance fires per tick
- **Persistence across restarts** — next-run timestamps are stored in Redis; missed jobs caught on startup
- **Missed-execution handling** — configurable threshold distinguishes catchup executions from truly-stale skips
- **Optional at-least-once execution** — renewable leases recover work after handler or process failures
- **Works with any `redis` v6 client** — `RedisClientType`, `RedisClusterType`, `RedisSentinelType`

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-schedule redis

# pnpm
pnpm add @codylabs/nestjs-redis-schedule redis
```

## Setup

### Synchronous

```typescript
import { Module } from '@nestjs/common';
import { createClient } from 'redis';
import { ScheduleModule } from '@codylabs/nestjs-redis-schedule';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

@Module({
  imports: [ScheduleModule.forRoot({ client: redisClient })],
})
export class AppModule {}
```

### Asynchronous (recommended)

```typescript
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@codylabs/nestjs-redis';
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

## Module options

| Option            | Type                                                       | Default          | Description                                                 |
| ----------------- | ---------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `client`          | `RedisClientType \| RedisClusterType \| RedisSentinelType` | **required**     | Connected Redis client                                      |
| `keyPrefix`       | `string`                                                   | `'scheduler'`    | Prefix for all Redis keys created by this module            |
| `shutdownTimeout` | `number`                                                   | `5000`           | Max ms to wait for in-flight handlers to finish on shutdown |
| `executionMode`   | `'at-most-once' \| 'at-least-once'`                        | `'at-most-once'` | Execution delivery guarantee                                |
| `leaseDuration`   | `number`                                                   | `30000`          | Lease duration in ms; renewed while a handler is running    |
| `maxRetries`      | `number`                                                   | `3`              | Retries after a failed or interrupted leased execution      |
| `cronJobs`        | `boolean`                                                  | `true`           | Enable `@Cron` discovery                                    |
| `intervals`       | `boolean`                                                  | `true`           | Enable `@Interval` discovery                                |
| `timeouts`        | `boolean`                                                  | `true`           | Enable `@Timeout` discovery                                 |

### Reliable execution

The default `at-most-once` mode preserves the original behavior: a due occurrence is removed before its handler
runs, so it is not duplicated but can be lost if the process exits at that point. Enable leased execution when a
missed occurrence is less acceptable than a possible duplicate:

```typescript
ScheduleModule.forRootAsync({
  inject: [RedisToken()],
  useFactory: (client) => ({
    client,
    executionMode: 'at-least-once',
    leaseDuration: 30_000,
    maxRetries: 3,
  }),
});
```

Leases are renewed while handlers run. A failed handler is retried after its lease expires, and an occurrence
claimed by a process that crashes is recovered by another instance. Handlers used with `at-least-once` mode must
be idempotent because a crash between completing the side effect and acknowledging the lease can cause a retry.

Redis keys use a shared `{schedule}` hash tag so all atomic scripts also work with Redis Cluster. Upgrading from a
version that used `<prefix>:jobs` keys creates a fresh schedule under the new key layout.

## Decorators

### `@Cron(expression, options?)`

Schedules a method as a distributed cron job. Only one instance in the cluster will execute the handler per tick.

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@codylabs/nestjs-redis-schedule';

@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    // runs on exactly one instance per tick
  }

  @Cron('0 9 * * MON-FRI', { name: 'weekday-report', timeZone: 'America/New_York' })
  handleWeekdayReport() {}

  @Cron('0 0 * * *', { utcOffset: 330 }) // UTC+5:30
  handleMidnightIST() {}
}
```

**`@Cron` options**

| Option      | Type      | Default         | Description                                                                             |
| ----------- | --------- | --------------- | --------------------------------------------------------------------------------------- |
| `name`      | `string`  | cron expression | Unique job name; used as the key in `SchedulerRegistry`                                 |
| `timeZone`  | `string`  | —               | IANA timezone name (e.g. `'America/New_York'`). Mutually exclusive with `utcOffset`     |
| `utcOffset` | `number`  | —               | UTC offset in **minutes** (e.g. `330` for UTC+5:30). Mutually exclusive with `timeZone` |
| `disabled`  | `boolean` | `false`         | Skip registration entirely                                                              |
| `threshold` | `number`  | `250`           | Ms of execution delay before a missed tick is skipped instead of caught up              |

### `@Interval(timeout)` / `@Interval(name, timeout)`

Schedules a method with `setInterval`. Runs on **every** instance — not distributed.

```typescript
@Interval('health-check', 30_000)
checkHealth() {}
```

### `@Timeout(timeout)` / `@Timeout(name, timeout)`

Schedules a method with `setTimeout`. Runs on **every** instance — not distributed.

```typescript
@Timeout('startup-task', 5_000)
onStartup() {}
```

## SchedulerRegistry

Inject `SchedulerRegistry` to manage jobs at runtime.

```typescript
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@codylabs/nestjs-redis-schedule';

@Injectable()
export class AdminService {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  async pauseJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    await job.stop();
  }

  async resumeJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    await job.start();
  }

  listJobs() {
    return [...this.schedulerRegistry.getCronJobs().entries()].map(([name, job]) => ({
      name,
      expression: job.expression,
      nextRun: new Date(job.nextTs),
    }));
  }
}
```

**`CronJobHandle` interface**

| Member       | Description                                     |
| ------------ | ----------------------------------------------- |
| `name`       | Job name                                        |
| `expression` | Cron expression string                          |
| `nextTs`     | Unix timestamp (ms) of the next scheduled run   |
| `start()`    | Re-registers the job in Redis and the poll loop |
| `stop()`     | Removes the job from Redis and the poll loop    |

**`SchedulerRegistry` methods**

| Method                  | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `getCronJob(name)`      | Returns the `CronJobHandle` for a cron job (throws if not found)   |
| `getCronJobs()`         | Returns a `Map<string, CronJobHandle>` of all registered cron jobs |
| `doesExist(type, name)` | Checks whether a `'cron'`, `'interval'`, or `'timeout'` job exists |
| `deleteCronJob(name)`   | Stops the job and removes it from the registry                     |
| `addCronJob(name, job)` | Registers an externally-created `CronJobHandle`                    |

## Migrating from `@nestjs/schedule`

1. Swap the package:

```diff
-import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';
+import { ScheduleModule, Cron, CronExpression } from '@codylabs/nestjs-redis-schedule';
```

2. Pass a Redis client when importing the module:

```diff
-ScheduleModule.forRoot()
+ScheduleModule.forRootAsync({
+  inject: [RedisToken()],
+  useFactory: (client) => ({ client }),
+})
```

Everything else (`@Cron`, `@Interval`, `@Timeout`, `SchedulerRegistry`, `CronExpression`) is API-compatible.

> **Note:** `@Interval` and `@Timeout` use native Node.js timers and run on every instance, identical to `@nestjs/schedule`. Only `@Cron` jobs are distributed via Redis.

## License

MIT
