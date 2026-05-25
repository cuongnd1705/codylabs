# @codylabs/nestjs-redis-client

Flexible, production-ready Redis client module for NestJS with multi-connection support, built on the modern node-redis client.

## Features

- Multi-connection support (named connections)
- Client, Cluster, and Sentinel modes
- NestJS DI integration and lifecycle management
- Async configuration with `forRootAsync`
- `forFeature()` for scoped connection re-exports
- Built-in health check indicator (no `@nestjs/terminus` dependency required)
- Configurable logging (enable, disable, or use a custom logger)
- Type-safe, production-ready

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-client redis

# pnpm
pnpm add @codylabs/nestjs-redis-client redis
```

## Usage

### Basic Usage

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@codylabs/nestjs-redis-client';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: 'redis://localhost:6379' },
    }),
  ],
})
export class AppModule {}
```

### Injecting the Redis Client

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@codylabs/nestjs-redis-client';
import type { RedisClientType } from 'redis';

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: RedisClientType) {}

  async setValue(key: string, value: string) {
    await this.redis.set(key, value);
  }

  async getValue(key: string) {
    return this.redis.get(key);
  }
}
```

### Multi-Connection

```typescript
@Module({
  imports: [
    RedisModule.forRoot({
      isGlobal: true,
      options: { url: 'redis://localhost:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'cache',
      type: 'client',
      options: { url: 'redis://cache:6379' },
    }),
    RedisModule.forRoot({
      connectionName: 'cluster',
      type: 'cluster',
      options: { rootNodes: [{ url: 'redis://cluster:6379' }] },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@codylabs/nestjs-redis-client';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        options: { url: configService.get<string>('REDIS_URL') },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Logging

Logging is controlled via the `logger` option in `forRoot` / `forRootAsync`:

```typescript
// Default — uses the built-in NestJS Logger
RedisModule.forRoot({
  options: { url: 'redis://localhost:6379' },
});

// Disable all logging
RedisModule.forRoot({
  logger: false,
  options: { url: 'redis://localhost:6379' },
});

// Custom logger
import type { RedisLogger } from '@codylabs/nestjs-redis-client';

const myLogger: RedisLogger = {
  log: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg),
};

RedisModule.forRoot({
  logger: myLogger,
  options: { url: 'redis://localhost:6379' },
});
```

### forFeature

Use `forFeature()` in feature modules to re-export a specific named connection without making the root module global:

```typescript
@Module({
  imports: [RedisModule.forFeature('cache')],
})
export class CacheFeatureModule {}
```

### Health Check

The built-in `RedisHealthIndicator` lets you check Redis connectivity without depending on `@nestjs/terminus`:

```typescript
import { Injectable, Get, Controller } from '@nestjs/common';
import { InjectRedis, RedisHealthIndicator } from '@codylabs/nestjs-redis-client';
import type { RedisClientType } from 'redis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectRedis() private readonly redis: RedisClientType,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get()
  async check() {
    return this.redisHealth.isHealthy('redis', this.redis);
    // Returns: { redis: { status: 'up' } }
    // Or:     { redis: { status: 'down', message: '...' } }
  }
}
```

Register `RedisHealthIndicator` in your module's providers:

```typescript
@Module({
  providers: [RedisHealthIndicator, HealthController],
})
export class HealthModule {}
```

## API

- `@InjectRedis(name?)` - Decorator to inject a Redis client
- `RedisToken(name?)` - Get the injection token for a Redis client
- `RedisModule.forRoot(options)` / `forRootAsync(options)` - Module registration
- `RedisModule.forFeature(name?)` - Re-export a named connection for feature modules
- `RedisHealthIndicator` - Injectable health check service
- `RedisInstance` - Type alias for all Redis client types (client, cluster, sentinel)
- `RedisLogger` - Interface for custom logger implementations

## License

MIT
