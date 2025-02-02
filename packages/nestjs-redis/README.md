# @codylabs/nestjs-redis

Redis (using node-redis) module for NestJS.

## Description

This module provides a Redis integration for NestJS applications using the `node-redis` library. It supports both Redis clients and Redis clusters, allowing you to easily connect to and interact with Redis servers.

## Installation

```sh
# npm
npm install @codylabs/nestjs-redis redis

# yarn
yarn add @codylabs/nestjs-redis redis

# pnpm
pnpm add @codylabs/nestjs-redis redis
```

## Usage

### Basic Usage

To use the nestjs-redis module, import it into your NestJS module and configure it with your Redis options.

```ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@codylabs/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      clientConfigurations: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

You can also configure the module asynchronously using `forRootAsync`.

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@codylabs/nestjs-redis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        clientConfigurations: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Using Redis Service

You can inject the `RedisService` to interact with Redis.

```ts
import { RedisClientConnectionType, RedisService } from "@codylabs/nestjs-redis";
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly client: RedisClientConnectionType;

  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getOrThrow();
  }

  async set(key: string, value: any, ttl?: number) {
    return this.client.set(key, value, {
      PX: ttl,
    });
  }
}
```