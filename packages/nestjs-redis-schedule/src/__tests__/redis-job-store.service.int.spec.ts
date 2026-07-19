import type { RedisClientType } from 'redis';

import { Test } from '@nestjs/testing';
import { createClient } from 'redis';

import { SCHEDULE_MODULE_OPTIONS } from '../constants';
import { RedisJobStore } from '../redis';

describe('RedisJobStore (integration)', () => {
  let client: RedisClientType;
  let store: RedisJobStore;

  beforeAll(async () => {
    client = createClient({
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      database: 7,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  beforeEach(async () => {
    await client.flushDb();
    const module = await Test.createTestingModule({
      providers: [
        RedisJobStore,
        {
          provide: SCHEDULE_MODULE_OPTIONS,
          useValue: { client, keyPrefix: 'test' },
        },
      ],
    }).compile();
    store = module.get(RedisJobStore);
  });

  describe('registerJob', () => {
    it('writes score to ZSET and expression to meta hash', async () => {
      await store.registerJob('job1', '* * * * *', 1000);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(1000);
      expect(await client.hGet('test:{schedule}:meta', 'job1')).toBe('* * * * *');
    });

    it('preserves existing score when expression is unchanged (NX)', async () => {
      await store.registerJob('job1', '* * * * *', 1000);
      await store.registerJob('job1', '* * * * *', 9999);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(1000);
    });

    it('overwrites score and meta when expression changed', async () => {
      await store.registerJob('job1', '* * * * *', 1000);
      await store.registerJob('job1', '0 * * * *', 9999);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(9999);
      expect(await client.hGet('test:{schedule}:meta', 'job1')).toBe('0 * * * *');
    });

    it('registers on first call (no prior meta)', async () => {
      await store.registerJob('job1', '* * * * *', 5000);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(5000);
    });
  });

  describe('claimDueJob', () => {
    it('returns the job name and score, and removes it from ZSET when due', async () => {
      const now = await store.getTime();
      await client.zAdd('test:{schedule}:jobs', { score: now - 100, value: 'job1' });

      const result = await store.claimDueJob(now);

      expect(result).toMatchObject({ name: 'job1' });
      expect(result?.score).toBeCloseTo(now - 100, -1);
      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBeNull();
    });

    it('returns null when no job is due yet', async () => {
      const now = await store.getTime();
      await client.zAdd('test:{schedule}:jobs', {
        score: now + 60_000,
        value: 'futureJob',
      });

      expect(await store.claimDueJob(now)).toBeNull();
    });

    it('only one concurrent caller wins the claim', async () => {
      const now = await store.getTime();
      await client.zAdd('test:{schedule}:jobs', { score: now - 10, value: 'job1' });

      const results = await Promise.all([store.claimDueJob(now), store.claimDueJob(now), store.claimDueJob(now)]);

      expect(results.filter((r) => r !== null)).toHaveLength(1);
    });

    it('recovers via raw script after SCRIPT FLUSH (NOSCRIPT fallback)', async () => {
      const now = await store.getTime();
      await client.zAdd('test:{schedule}:jobs', { score: now - 10, value: 'job1' });

      // Prime the internal SHA cache
      await store.claimDueJob(now);

      // Evict all cached scripts from Redis
      await client.scriptFlush();

      await client.zAdd('test:{schedule}:jobs', { score: now - 10, value: 'job2' });
      expect(await store.claimDueJob(now)).toMatchObject({ name: 'job2' });
    });
  });

  describe('leased claims', () => {
    it('reclaims an expired execution and acknowledges it', async () => {
      const module = await Test.createTestingModule({
        providers: [
          RedisJobStore,
          {
            provide: SCHEDULE_MODULE_OPTIONS,
            useValue: {
              client,
              keyPrefix: 'leased-test',
              executionMode: 'at-least-once',
              leaseDuration: 100,
              maxRetries: 2,
            },
          },
        ],
      }).compile();
      const leasedStore = module.get(RedisJobStore);
      const now = await leasedStore.getTime();
      await leasedStore.registerJob('job1', '* * * * *', now - 10);

      const claimed = await leasedStore.claimDueJob(now);
      expect(claimed).toMatchObject({ name: 'job1', attempt: 0, retry: false });
      expect(claimed?.claimId).toBeDefined();
      expect(await leasedStore.reclaimExpiredJob(now + 50)).toBeNull();

      const retried = await leasedStore.reclaimExpiredJob(now + 101);
      expect(retried).toMatchObject({ name: 'job1', attempt: 1, retry: true });

      await leasedStore.acknowledgeJob(retried!.claimId);
      expect(await client.zCard('leased-test:{schedule}:processing')).toBe(0);
      expect(await client.hLen('leased-test:{schedule}:claims')).toBe(0);
      await module.close();
    });
  });

  describe('peekNextJob', () => {
    it('returns null when ZSET is empty', async () => {
      expect(await store.peekNextJob()).toBeNull();
    });

    it('returns the earliest entry without removing it', async () => {
      await client.zAdd('test:{schedule}:jobs', [
        { score: 3000, value: 'job3' },
        { score: 1000, value: 'job1' },
        { score: 2000, value: 'job2' },
      ]);

      expect(await store.peekNextJob()).toEqual({ name: 'job1', score: 1000 });
      expect(await client.zCard('test:{schedule}:jobs')).toBe(3);
    });
  });

  describe('enqueueJob', () => {
    it('adds job to ZSET', async () => {
      await store.enqueueJob('job1', 5000);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(5000);
    });

    it('overwrites existing score', async () => {
      await store.enqueueJob('job1', 5000);
      await store.enqueueJob('job1', 9000);

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBe(9000);
    });
  });

  describe('removeJob', () => {
    it('removes from both ZSET and meta hash', async () => {
      await store.registerJob('job1', '* * * * *', 1000);
      await store.removeJob('job1');

      expect(await client.zScore('test:{schedule}:jobs', 'job1')).toBeNull();
      expect(await client.hGet('test:{schedule}:meta', 'job1')).toBeNull();
    });
  });

  describe('getTime', () => {
    it('returns millisecond timestamp within 1s of local clock', async () => {
      const before = Date.now();
      const redisTime = await store.getTime();
      const after = Date.now();

      expect(redisTime).toBeGreaterThanOrEqual(before - 1000);
      expect(redisTime).toBeLessThanOrEqual(after + 1000);
    });
  });
});
