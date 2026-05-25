# @codylabs/nestjs-redis-lock

Redis-based distributed lock module for NestJS, built on @redis-kit/lock.

## Features

- Redlock-based distributed locks
- Works with existing `@codylabs/nestjs-redis-client` connections
- Decorator `@Redlock()` and `RedlockService`
- Type-safe, production-ready

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis-lock @codylabs/nestjs-redis-client redis

# pnpm
pnpm add @codylabs/nestjs-redis-lock @codylabs/nestjs-redis-client redis
```

## Usage

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { RedisModule, RedisToken } from '@codylabs/nestjs-redis-client';
import { RedlockModule } from '@codylabs/nestjs-redis-lock';

@Module({
  imports: [
    RedisModule.forRoot({ options: { url: 'redis://localhost:6379' } }),
    RedlockModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis) => ({ clients: [redis] }),
    }),
  ],
})
export class AppModule {}
```

### Decorator Usage

```typescript
import { Injectable } from '@nestjs/common';
import { Redlock } from '@codylabs/nestjs-redis-lock';

@Injectable()
export class UserService {
  @Redlock('user:update', 5000)
  async updateUserBalance(userId: string, amount: number) {
    // critical work
  }
}
```

### Service Usage

```typescript
import { Injectable } from '@nestjs/common';
import { RedlockService } from '@codylabs/nestjs-redis-lock';

@Injectable()
export class PaymentService {
  constructor(private readonly redlock: RedlockService) {}

  async processPayment(paymentId: string) {
    return this.redlock.withLock([`payment:${paymentId}`], 5000, async () => {
      // critical work
    });
  }
}
```

## License

MIT
