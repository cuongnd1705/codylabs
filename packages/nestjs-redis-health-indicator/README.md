# @codylabs/nestjs-redis-health-indicator

A comprehensive Redis health indicator for NestJS applications using the Terminus health check library.

## Features

- Plug-and-play Terminus health checks
- Works with existing `@codylabs/nestjs-redis-client` connections
- Supports multiple Redis instances
- Type-safe, production-ready

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-health-indicator @codylabs/nestjs-redis-client redis @nestjs/terminus

# pnpm
pnpm add @codylabs/nestjs-redis-health-indicator @codylabs/nestjs-redis-client redis @nestjs/terminus
```

## Usage

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@codylabs/nestjs-redis-client';
import { RedisHealthIndicator } from '@codylabs/nestjs-redis-health-indicator';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'client',
      options: { url: 'redis://localhost:6379' },
    }),
    TerminusModule,
  ],
  providers: [RedisHealthIndicator],
})
export class AppModule {}
```

### Health Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectRedis } from '@codylabs/nestjs-redis-client';
import { RedisHealthIndicator } from '@codylabs/nestjs-redis-health-indicator';
import type { RedisClientType } from 'redis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis() private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.redis.isHealthy('redis', { client: this.redisClient })]);
  }
}
```

### Multiple Instances

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis() private readonly mainRedis: RedisClientType,
    @InjectRedis('cache') private readonly cacheRedis: RedisClientType,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redis.isHealthy('redis-main', { client: this.mainRedis }),
      () => this.redis.isHealthy('redis-cache', { client: this.cacheRedis }),
    ]);
  }
}
```

## License

MIT
