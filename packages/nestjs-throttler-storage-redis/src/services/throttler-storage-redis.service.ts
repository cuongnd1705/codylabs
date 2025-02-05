import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import {
  createClient,
  createCluster,
  RedisClientOptions,
  RedisClientType,
  RedisClusterOptions,
  RedisClusterType,
} from 'redis';

import { RedisClientConnectionType, RedisOptions } from '../types';

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage, OnModuleDestroy {
  private client: RedisClientConnectionType = createClient() as RedisClientType;
  private namespace = 'throttler';
  private keyPrefixSeparator = ':';
  private closeAfterDestroyed = true;

  /**
   * ThrottlerStorageRedisService constructor.
   * @param {string | RedisClientOptions | RedisClusterOptions | RedisClientConnectionType} [connect] How to connect to the Redis server. If string pass in the url, if object pass in the options, if RedisClient pass in the client.
   * @param {RedisOptions} [options] Options for the adapter such as namespace, keyPrefixSeparator, closeAfterDestroyed, logging.
   */
  constructor(
    connect: string | RedisClientOptions | RedisClusterOptions | RedisClientConnectionType,
    options?: RedisOptions,
  ) {
    if (!connect) {
      throw new Error('No connection options provided');
    }

    if (typeof connect === 'string') {
      this.client = createClient({
        url: connect,
      });
    } else if ((connect as any).connect !== undefined) {
      this.client = this.isClientCluster(connect as RedisClientConnectionType)
        ? (connect as RedisClusterType)
        : (connect as RedisClientType);
    } else if (connect instanceof Object) {
      this.client =
        (connect as any).rootNodes === undefined
          ? (createClient(connect as RedisClientOptions) as RedisClientType)
          : (createCluster(connect as RedisClusterOptions) as RedisClusterType);
    }

    this.setOptions(options);
  }

  private async getClient(): Promise<RedisClientConnectionType> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    return this.client;
  }

  private isClientCluster(client: RedisClientConnectionType): boolean {
    if ((client as any).options === undefined && (client as any).scan === undefined) {
      return true;
    }

    return false;
  }

  private setOptions(options?: RedisOptions): void {
    if (!options) {
      return;
    }

    if (options.namespace) {
      this.namespace = options.namespace;
    }

    if (options.keyPrefixSeparator) {
      this.keyPrefixSeparator = options.keyPrefixSeparator;
    }

    if (options.closeAfterDestroyed !== undefined) {
      this.closeAfterDestroyed = options.closeAfterDestroyed;
    }
  }

  private get script(): string {
    return `
      local hitKey, blockKey = KEYS[1], KEYS[2]
      local ttl, limit, blockDuration = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])

      local totalHits = redis.call("INCR", hitKey)
      local timeToExpire = redis.call("PTTL", hitKey)

      if timeToExpire <= 0 then
        redis.call("PEXPIRE", hitKey, ttl)
        timeToExpire = ttl
      end

      local isBlocked = redis.call('GET', blockKey)
      local timeToBlockExpire = 0

      if isBlocked then
        timeToBlockExpire = redis.call('PTTL', blockKey)
      elseif totalHits > limit then
        redis.call('SET', blockKey, 1, 'PX', blockDuration)
        isBlocked, timeToBlockExpire = '1', blockDuration
      end

      if isBlocked and timeToBlockExpire <= 0 then
        redis.call('DEL', blockKey)
        redis.call('SET', hitKey, 1, 'PX', ttl)
        totalHits, timeToExpire, isBlocked = 1, ttl, false
      end

      return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
    `
      .replace(/^\s+/gm, '')
      .trim();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const client = await this.getClient();

    const namespace = this.namespace;
    const separator = this.keyPrefixSeparator;

    const hitKey = `${namespace}${separator}${key}${separator}${throttlerName}${separator}hits`;
    const blockKey = `${namespace}${separator}${key}${separator}${throttlerName}${separator}blocked`;

    const results = (await client.eval(this.script, {
      keys: [hitKey, blockKey],
      arguments: [ttl.toString(), limit.toString(), blockDuration.toString()],
    })) as number[];

    if (!Array.isArray(results)) {
      throw new TypeError(`Expected result to be array of values, got ${results}`);
    }

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = results;

    if ([totalHits, timeToExpire, isBlocked, timeToBlockExpire].some(Number.isNaN)) {
      throw new TypeError('Expected all results to be numbers');
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    };
  }

  async onModuleDestroy() {
    if (this.closeAfterDestroyed && this.client.isOpen) {
      await this.client.disconnect();
    }
  }
}
