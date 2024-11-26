# @codylabs/nestjs-throttler-storage-redis

Redis (node-redis) storage provider for the [@nestjs/throttler](https://github.com/nestjs/throttler) package.

# Installation

```sh
# npm
npm install @codylabs/nestjs-throttler-storage-redis redis

# yarn
yarn add @codylabs/nestjs-throttler-storage-redis redis

# pnpm
pnpm add @codylabs/nestjs-throttler-storage-redis redis
```

# Basic usage

```ts
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@codylabs/nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 5, ttl: seconds(60) }],
      storage: new ThrottlerStorageRedisService('redis://localhost:6379')
    }),
  ],
})
export class AppModule {}
```

Inject another config module and service:

```ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@codylabs/nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL'),
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
        storage: new ThrottlerStorageRedisService('redis://localhost:6379')
      }),
    }),
  ],
})
export class AppModule {}
```