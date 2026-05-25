# @codylabs/nestjs-redis-throttler-storage

Redis storage for NestJS Throttler enabling distributed rate limiting across multiple application instances.

## Features

- Distributed rate limiting with Redis
- Drop-in replacement for in-memory storage
- Works with existing `@codylabs/nestjs-redis-client` connections
- Client, Cluster and Sentinel support
- Six pluggable rate-limiting algorithms via `ThrottlerAlgorithm`
- All algorithms implemented as atomic Lua scripts (EVALSHA + NOSCRIPT fallback)
- Optional block key support: lock out a client for a configurable duration after exceeding the limit

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-throttler-storage @codylabs/nestjs-redis-client redis @nestjs/throttler

# pnpm
pnpm add @codylabs/nestjs-redis-throttler-storage @codylabs/nestjs-redis-client redis @nestjs/throttler
```

## Usage

### With Existing Redis Connection (Recommended)

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisModule, RedisToken } from '@codylabs/nestjs-redis-client';
import { RedisThrottlerStorage } from '@codylabs/nestjs-redis-throttler-storage';

@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

### Without Existing Redis Connection

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } })],
      inject: [RedisToken()],
      useFactory: (redis) => ({
        throttlers: [{ limit: 5, ttl: seconds(60) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
  ],
})
export class AppModule {}
```

## Algorithms

Pass a `ThrottlerAlgorithm` as the second argument to `RedisThrottlerStorage`. The default is `ThrottlerAlgorithm.FixedWindow`.

```typescript
import { RedisThrottlerStorage, ThrottlerAlgorithm } from '@codylabs/nestjs-redis-throttler-storage';

new RedisThrottlerStorage(redis, ThrottlerAlgorithm.TokenBucket);
```

| Algorithm              | Memory | Accuracy        | Burst handling       | Best for                             |
| ---------------------- | ------ | --------------- | -------------------- | ------------------------------------ |
| `FixedWindow`          | O(1)   | Low at boundary | Up to 2x at boundary | Drop-in NestJS replacement (default) |
| `SlidingWindowLog`     | O(n)   | Exact           | None                 | Strict per-user limits               |
| `SlidingWindowCounter` | O(1)   | Good            | Smoothed             | General-purpose (recommended)        |
| `TokenBucket`          | O(1)   | Good            | Yes (up to capacity) | Bursty clients                       |
| `LeakyBucketPolicing`  | O(1)   | Good            | None (hard reject)   | Hard ingress cap, no queuing         |
| `LeakyBucketShaping`   | O(1)   | Good            | None (queued)        | Smooth output rate with queuing      |

**`FixedWindow` is the default** because `@nestjs/throttler`'s built-in in-memory storage uses fixed window internally, making this a true drop-in replacement with identical behavior. For new projects, **`SlidingWindowCounter`** is the recommended general-purpose choice.

### Custom Algorithm

You can bring your own Lua script. The script receives `KEYS[1]` (the rate-limit key) and `ARGV[1..3]` (`ttlMs`, `limit`, `blockDurationMs`), and must return a 4-element array `[totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked]`.

```typescript
new RedisThrottlerStorage(redis, {
  script: `
    local key = KEYS[1]
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    -- ... your logic ...
    return { count, pttl, -1, 0 }
  `,
});
```

### Block Duration

All algorithms support an optional block period. When `blockDuration` is set in your throttler config, a client that exceeds the limit is locked out for the full block duration.

```typescript
ThrottlerModule.forRootAsync({
  inject: [RedisToken()],
  useFactory: (redis) => ({
    throttlers: [{
      limit: 10,
      ttl: seconds(60),
      blockDuration: seconds(300), // block for 5 minutes after exceeding limit
    }],
    storage: new RedisThrottlerStorage(redis, ThrottlerAlgorithm.SlidingWindowLog),
  }),
}),
```

## License

MIT
