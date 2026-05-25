import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { RedisInstance } from '../types';

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(key: string, client: RedisInstance) {
    const indicator = this.healthIndicatorService.check(key);

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
