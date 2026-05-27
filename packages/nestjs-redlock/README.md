# @codylabs/nestjs-redlock

NestJS module for distributed locking via the [Redlock algorithm](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/), built on [`@codylabs/redlock`](../redlock).

## Features

- `RedlockModule` with `forRoot` / `forRootAsync` — plugs into any NestJS application
- `RedlockService` — injectable service extending `Redlock` directly (full API available)
- `@Redlock()` decorator — wraps any method in a distributed lock with a single line
- `isGlobal` support (defaults to `true`)

## Installation

```sh
# npm
npm install @codylabs/nestjs-redlock @codylabs/redlock redis

# pnpm
pnpm add @codylabs/nestjs-redlock @codylabs/redlock redis
```

`@codylabs/redlock` and `redis` (v5+) are required peer dependencies.

> **Tip**: If you already use [`@codylabs/nestjs-redis`](../nestjs-redis) in your application, you can inject the managed Redis client directly into `RedlockModule` instead of creating clients manually. See [Using with @codylabs/nestjs-redis](#using-with-codylabsnestjs-redis).

## Usage

### Module setup

```typescript
import { Module } from '@nestjs/common';
import { createClient } from 'redis';
import { RedlockModule } from '@codylabs/nestjs-redlock';

@Module({
  imports: [
    RedlockModule.forRoot({
      clients: [
        createClient({ url: 'redis://redis1:6379' }),
        createClient({ url: 'redis://redis2:6379' }),
        createClient({ url: 'redis://redis3:6379' }),
      ],
      redlockConfig: {
        retryDelayMs: 200,
        maxRetryAttempts: 3,
      },
    }),
  ],
})
export class AppModule {}
```

`clients` accepts `RedisClientType`, `RedisClusterType`, and `RedisSentinelType`. For a single-node HA setup, pass one Cluster or Sentinel client; for full Redlock fault tolerance, pass multiple independent instances.

```typescript
import { createCluster, createSentinel } from 'redis';

// Redis Cluster
RedlockModule.forRoot({
  clients: [createCluster({ rootNodes: [{ url: 'redis://node1:6379' }] })],
});

// Redis Sentinel
RedlockModule.forRoot({
  clients: [createSentinel({ sentinelRootNodes: [{ host: 'sentinel1', port: 26379 }], name: 'mymaster' })],
});
```

#### Async setup

```typescript
@Module({
  imports: [
    RedlockModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clients: config.get('redisClients'),
      }),
    }),
  ],
})
export class AppModule {}
```

### `@Redlock()` decorator

Wrap a method in a distributed lock — the lock is acquired before the method runs and released automatically when it returns or throws.

```typescript
import { Injectable } from '@nestjs/common';
import { Redlock } from '@codylabs/nestjs-redlock';

@Injectable()
export class OrderService {
  // Single resource
  @Redlock('order:process', 10_000)
  async processOrder(orderId: string) {
    // only one instance runs this at a time
  }

  // Multiple resources (acquired atomically, sorted to prevent deadlocks)
  @Redlock(['user:123', 'order:456'], 10_000)
  async transferFunds(userId: string, orderId: string) {
    // locks both resources atomically
  }

  // With per-call retry and auto-extension options
  @Redlock('report:generate', 60_000, { maxRetryAttempts: 5, extensionThresholdMs: 10_000 })
  async generateReport() {
    // lock auto-extends when within 10s of expiry
  }
}
```

> **Note**: `RedlockModule` must be imported in the same module (or registered as `isGlobal: true`, the default) for the decorator injection to work.

### `RedlockService`

`RedlockService` extends `Redlock` directly, so the full API is available:

```typescript
import { Injectable } from '@nestjs/common';
import { RedlockService } from '@codylabs/nestjs-redlock';

@Injectable()
export class PaymentService {
  constructor(private readonly redlock: RedlockService) {}

  async processPayment(paymentId: string) {
    // withLock — acquires, auto-extends, and always releases
    return this.redlock.withLock(`payment:${paymentId}`, 30_000, async (signal) => {
      if (signal.aborted) throw signal.reason;
      return await this.charge(paymentId);
    });
  }

  async reserveInventory(itemId: string) {
    // Manual acquire / release
    const lock = await this.redlock.acquire(`inventory:${itemId}`, 5_000);
    if (!lock) throw new Error('Could not acquire inventory lock');

    try {
      return await this.deductStock(itemId);
    } finally {
      await lock.release();
    }
  }
}
```

See [`@codylabs/redlock`](../redlock/README.md) for the full API reference.

## Using with @codylabs/nestjs-redis

If your application already uses [`@codylabs/nestjs-redis`](../nestjs-redis) to manage Redis connections, you can reuse those clients directly — no need to create separate clients for locking.

```sh
pnpm add @codylabs/nestjs-redis
```

```typescript
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@codylabs/nestjs-redis';
import { RedlockModule } from '@codylabs/nestjs-redlock';
import type { RedisClientType } from 'redis';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: 'redis://localhost:6379' },
      isGlobal: true,
    }),
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (client: RedisClientType) => ({
        clients: [client],
      }),
    }),
  ],
})
export class AppModule {}
```

This way `@codylabs/nestjs-redis` owns the connection lifecycle and `RedlockModule` simply borrows the client.

> **Note**: Redis client lifecycle (connect/quit) is always the caller's responsibility. `RedlockModule` does not open or close connections.

## Configuration

| Option          | Type                | Default | Description                                                                 |
| --------------- | ------------------- | ------- | --------------------------------------------------------------------------- |
| `clients`       | `RedisClientLike[]` | —       | Independent Redis clients (standard, cluster, or sentinel). Recommended: 5. |
| `redlockConfig` | `RedlockOptions`    | —       | Retry and drift options. See `@codylabs/redlock`.                           |
| `isGlobal`      | `boolean`           | `true`  | Register the module globally.                                               |

## License

MIT
