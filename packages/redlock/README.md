# @codylabs/redlock

A TypeScript implementation of the [Redlock algorithm](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) for distributed locking with Redis. Provides mutual exclusion, deadlock freedom, and fault tolerance across multiple independent Redis instances.

## Features

- Redlock algorithm with majority quorum consensus
- **Early quorum resolution** — resolves as soon as N/2+1 nodes agree, without waiting for slow/failing nodes
- **EVALSHA caching** — sends Lua script hash instead of full script after first use; falls back to EVAL automatically
- Multi-resource (multi-key) atomic locking with deadlock prevention via sorted key ordering
- `withLock` helper with **AbortSignal** support — routine can detect when auto-extension fails and abort safely
- Per-call option overrides for `acquire` and `withLock` (retry delay, jitter, max attempts)
- Unlimited retries (`maxRetryAttempts: -1`)
- Automatic lock extension
- Cryptographically secure token generation
- Retry with configurable delay and symmetric random jitter (avoids thundering herd)
- Clock drift compensation per the Redlock spec
- Atomic acquire / release / extend via Lua scripts
- `quit()` for graceful connection teardown

## Installation

```sh
# npm
npm install @codylabs/redlock redis

# pnpm
pnpm add @codylabs/redlock redis
```

`redis` (v5+) is a required peer dependency.

## Usage

### Setup

The Redlock algorithm requires **N independent Redis instances** (not replicas). The recommended setup is 5 instances, giving a quorum of 3.

```typescript
import { createClient } from 'redis';
import { Redlock } from '@codylabs/redlock';

const clients = [
  createClient({ url: 'redis://redis1:6379' }),
  createClient({ url: 'redis://redis2:6379' }),
  createClient({ url: 'redis://redis3:6379' }),
  createClient({ url: 'redis://redis4:6379' }),
  createClient({ url: 'redis://redis5:6379' }),
];

await Promise.all(clients.map((c) => c.connect()));

const redlock = new Redlock(clients, {
  driftFactor: 0.01, // clock drift compensation (1% of TTL + 2ms constant)
  retryDelayMs: 200, // base retry delay
  retryJitterMs: 100, // symmetric jitter (±100ms) to avoid thundering herd
  maxRetryAttempts: 3, // max acquisition attempts; use -1 for unlimited
});
```

### Basic: `acquire` / `release`

```typescript
const lock = await redlock.acquire('my-resource', 30_000); // TTL: 30s

if (!lock) {
  throw new Error('Could not acquire lock');
}

try {
  // critical section
} finally {
  await lock.release();
}
```

### Recommended: `withLock`

Automatically acquires, optionally extends, and always releases the lock. The routine receives an `AbortSignal` that is aborted if auto-extension fails mid-execution:

```typescript
const result = await redlock.withLock('my-resource', 30_000, async (signal) => {
  const data = await fetchData();
  if (signal.aborted) throw signal.reason; // lock was lost
  return processData(data);
});
```

With automatic extension (extends the lock before it expires while the function runs):

```typescript
const result = await redlock.withLock(
  'my-resource',
  30_000,
  async (signal) => {
    const data = await fetchData();
    if (signal.aborted) throw signal.reason;
    return processData(data);
  },
  { extensionThresholdMs: 5_000 }, // extend 5s before expiry
);
```

### Per-call option overrides

Override instance-level defaults for a single `acquire` or `withLock` call:

```typescript
// Retry aggressively for a high-priority resource
const lock = await redlock.acquire('critical-job', 10_000, {
  retryDelayMs: 50,
  retryJitterMs: 20,
  maxRetryAttempts: 10,
});

// Fail fast for a low-priority resource
await redlock.withLock('best-effort', 5_000, async (signal) => doWork(signal), {
  maxRetryAttempts: 0, // try once, don't retry
});
```

### Unlimited retries

```typescript
const redlock = new Redlock(clients, {
  maxRetryAttempts: -1, // keep trying until the lock is acquired
  retryDelayMs: 200,
  retryJitterMs: 100,
});
```

### Multi-resource locking

Acquire locks on multiple resources atomically. Resources are sorted lexicographically before locking to prevent deadlocks.

```typescript
const lock = await redlock.acquire(['user:123', 'order:456'], 10_000);

if (!lock) {
  throw new Error('Could not acquire locks');
}

try {
  // critical section affecting both resources
} finally {
  await lock.release();
}
```

Or with `withLock`:

```typescript
await redlock.withLock(['user:123', 'order:456'], 10_000, async (signal) => {
  if (signal.aborted) throw signal.reason;
  await transferFunds(userId, orderId);
});
```

### Manual extension

```typescript
const lock = await redlock.acquire('my-resource', 5_000);

// ... later, extend by another 5s
const extended = await lock.extend(5_000);
if (!extended) {
  // lock was lost; abort the operation
}
```

### Auto-extension

`startAutoExtension` accepts an optional `onFailure` callback. If omitted a warning is logged; if provided, the callback is called with the error instead (useful for aborting work on lock loss):

```typescript
const lock = await redlock.acquire('my-resource', 30_000);
lock.startAutoExtension(5_000, (err) => {
  console.error('Lock lost!', err);
  // signal your work to stop
});

try {
  await longRunningWork();
} finally {
  lock.stopAutoExtension();
  await lock.release();
}
```

### Inspecting lock state

```typescript
lock.isValid; // true if not released and not expired
lock.isReleased; // true after release() is called
lock.isExpired; // true if past the TTL
lock.expirationTime; // Date when the lock expires
lock.resourceKeys; // string[] of locked keys
```

### Lifecycle / cleanup

```typescript
// Gracefully close all Redis connections managed by Redlock
await redlock.quit();
```

### Using Redis Cluster or Sentinel

`Redlock` accepts `RedisClientType`, `RedisClusterType`, and `RedisSentinelType` from the `redis` package.

**Redis Cluster** — the cluster handles replication internally, so a single cluster client counts as one Redlock node:

```typescript
import { createCluster } from 'redis';

const cluster = createCluster({
  rootNodes: [{ url: 'redis://node1:6379' }, { url: 'redis://node2:6379' }, { url: 'redis://node3:6379' }],
});
await cluster.connect();

const redlock = new Redlock([cluster]);
```

**Redis Sentinel** — Sentinel provides HA for a single logical instance, also treated as one Redlock node:

```typescript
import { createSentinel } from 'redis';

const sentinel = createSentinel({
  sentinelRootNodes: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 },
    { host: 'sentinel3', port: 26379 },
  ],
  name: 'mymaster',
});
await sentinel.connect();

const redlock = new Redlock([sentinel]);
```

> **Note**: For the strongest fault tolerance guarantees of the Redlock algorithm, use multiple independent Redis instances (not replicas of each other). A single Cluster or Sentinel client gives HA for one logical node but does not provide cross-node quorum.

## Configuration

| Option             | Type     | Default | Description                                                                  |
| ------------------ | -------- | ------- | ---------------------------------------------------------------------------- |
| `driftFactor`      | `number` | `0.01`  | Clock drift factor (0–0.1). Applied as `driftFactor × TTL + 2ms`.            |
| `retryDelayMs`     | `number` | `200`   | Base delay in ms between acquisition attempts.                               |
| `retryJitterMs`    | `number` | `100`   | Symmetric jitter (±N ms) added to retry delay to avoid thundering herd.      |
| `maxRetryAttempts` | `number` | `3`     | Total acquisition attempts before giving up. Use `-1` for unlimited retries. |

All options can be overridden per `acquire` / `withLock` call via `AcquireOptions` / `WithLockOptions`.

## Error types

| Class                   | `error.name`              | When thrown                                       |
| ----------------------- | ------------------------- | ------------------------------------------------- |
| `InvalidParameterError` | `'InvalidParameterError'` | Invalid arguments (empty key, negative TTL, etc.) |
| `RedisConnectionError`  | `'RedisConnectionError'`  | Redis operation failure                           |

## Algorithm notes

This implementation follows the [official Redlock specification](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/):

- **Quorum**: a lock is considered acquired only when `⌊N/2⌋ + 1` instances confirm it.
- **Early quorum resolution**: operations resolve as soon as the outcome is determined — no waiting for slow or failing nodes.
- **Effective validity**: `TTL - elapsed - (driftFactor × TTL + 2ms)` — the usable lock lifetime after drift and network latency are subtracted.
- **Timing**: if the effective validity ≤ 1ms after acquisition, the attempt is rejected even with majority consensus.
- **EVALSHA caching**: Lua scripts are identified by their SHA1 hash. Redis caches them after the first `EVAL`; subsequent calls use `EVALSHA` (faster, less bandwidth). The library falls back transparently on `NOSCRIPT` errors.
- **Lua atomicity**: acquire, release, and extend all use atomic Lua scripts to prevent race conditions within each Redis instance.
- **Multi-resource deadlock prevention**: keys are sorted lexicographically before locking so concurrent callers always acquire in the same order.
