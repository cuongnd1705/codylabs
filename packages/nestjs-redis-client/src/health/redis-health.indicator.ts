import { Injectable } from '@nestjs/common';

import { RedisInstance } from '../types';
import { HealthIndicatorResult, HealthIndicatorSession } from './health-indicator.service';

/**
 * Health indicator for Redis connections.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class HealthController {
 *   constructor(
 *     @InjectRedis() private readonly redis: RedisClientType,
 *     private readonly redisHealth: RedisHealthIndicator,
 *   ) {}
 *
 *   @Get('health')
 *   async check() {
 *     return this.redisHealth.isHealthy('redis', this.redis);
 *   }
 * }
 * ```
 *
 * @publicApi
 */
@Injectable()
export class RedisHealthIndicator {
  async isHealthy(key: string, client: RedisInstance): Promise<HealthIndicatorResult> {
    const indicator = new HealthIndicatorSession(key);

    try {
      const result = await client.ping();
      const isHealthy = result === 'PONG';

      if (!isHealthy) {
        return indicator.down({ message: `Redis ping failed: ${result}` });
      }

      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Redis connection failed',
      });
    }
  }
}
