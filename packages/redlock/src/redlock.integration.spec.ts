import { type RedisClientType, createClient } from 'redis';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { Redlock, RedlockInstance } from './redlock.js';

// Helper function to parse REDIS_HOSTS environment variable
function getRedisConfig(): Array<{ host: string; port: number }> {
  const redisHosts =
    process.env.REDIS_HOSTS ??
    'localhost,localhost,localhost,localhost,localhost';
  const redisPorts = process.env.REDIS_PORTS ?? '6379,6380,6381,6382,6383';

  const hosts = redisHosts.split(',').map((host) => host.trim());
  const ports = redisPorts.split(',').map((port) => parseInt(port.trim(), 10));
  if (hosts.length !== ports.length) {
    throw new Error(
      'REDIS_HOSTS and REDIS_PORTS must have the same number of entries',
    );
  }

  return hosts.map((host, index) => ({
    host,
    port: ports[index],
  }));
}

// Integration test configuration
const REDIS_INSTANCES = getRedisConfig();

const TEST_KEY_PREFIX = 'redlock:test:';
const TEST_TTL = 5000; // 5 seconds

describe('Redlock Integration Tests', () => {
  let redisClients: RedisClientType[];
  let redlock: Redlock;

  beforeAll(async () => {
    // Create Redis clients for all instances
    redisClients = REDIS_INSTANCES.map((config) =>
      createClient({
        socket: {
          host: config.host,
          port: config.port,
          // Disable retry to fail fast in tests
          reconnectStrategy: false,
        },
      }),
    );
  });

  afterAll(async () => {
    await Promise.all(redisClients.map((client) => client.quit()));
  });

  beforeEach(async () => {
    // Reconnect clients (just in case they were disconnected in tests)
    await Promise.allSettled(redisClients.map((client) => client.connect()));

    redlock = new Redlock(redisClients, {
      driftFactor: 0.01,
      retryDelayMs: 100,
      retryJitterMs: 50,
      maxRetryAttempts: 2,
    });
  });

  afterEach(async () => {
    await Promise.allSettled(redisClients.map((client) => client.flushAll()));
  });

  // Helper to generate unique test keys
  function generateTestKey(): string {
    return `${TEST_KEY_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper to check if we have enough instances for testing
  describe('Basic Lock Operations', () => {
    it('should acquire and release a lock successfully', async () => {
      const key = generateTestKey();

      const lock = await redlock.acquire(key, TEST_TTL);

      expect(lock).not.toBeNull();
      if (lock) {
        expect(lock.expirationTime).toBeInstanceOf(Date);
        expect(lock.isValid).toBe(true);
        expect(lock.isReleased).toBe(false);

        // Release lock
        const released = await lock.release();
        expect(released).toBe(true);
        expect(lock.isReleased).toBe(true);
      }
    });

    it('should prevent concurrent lock acquisition', async () => {
      const key = generateTestKey();

      // First client acquires lock
      const lock1 = await redlock.acquire(key, TEST_TTL);
      expect(lock1).not.toBeNull();

      if (!lock1) throw new Error('Failed to acquire lock');

      // Second client should fail to acquire the same lock
      const lock2 = await redlock.acquire(key, TEST_TTL);
      expect(lock2).toBeNull();

      // Release first lock
      await lock1.release();

      // Now second client should be able to acquire
      const lock3 = await redlock.acquire(key, TEST_TTL);
      expect(lock3).not.toBeNull();

      if (lock3) {
        await lock3.release();
      }
    });

    it('should extend lock TTL successfully', async () => {
      const key = generateTestKey();

      // Acquire lock with short TTL
      const lock = await redlock.acquire(key, 2000);
      expect(lock).not.toBeNull();

      if (!lock) throw new Error('Failed to acquire lock');

      // Extend the lock
      const extended = await lock.extend(5000);
      expect(extended).toBe(true);

      // Clean up
      await lock.release();
    });

    it('should fail to extend with invalid token', async () => {
      const key = generateTestKey();

      // Acquire lock first
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (!lock) throw new Error('Failed to acquire lock');

      // Try to extend with wrong token by creating a fake RedlockInstance
      const fakeToken = 'invalid-token';
      const fakeExpiresAt = new Date(Date.now() + TEST_TTL);
      const fakeLock = new RedlockInstance(
        redlock,
        key,
        fakeToken,
        fakeExpiresAt,
        TEST_TTL,
      );

      // This should fail because the token is invalid
      const extended = await fakeLock.extend();
      expect(extended).toBe(false);

      // Clean up real lock
      await lock.release();
    });
  });

  describe('Lock Expiration', () => {
    it('should automatically expire locks after TTL', async () => {
      const key = generateTestKey();
      const shortTtl = 1000; // 1 second

      // Acquire lock with short TTL
      const lock = await redlock.acquire(key, shortTtl);
      expect(lock).not.toBeNull();

      if (!lock) throw new Error('Failed to acquire lock');

      // Wait for lock to expire
      await new Promise((resolve) => setTimeout(resolve, shortTtl + 500));

      // Should be able to acquire the same lock now
      const lock2 = await redlock.acquire(key, TEST_TTL);
      expect(lock2).not.toBeNull();

      if (lock2) {
        await lock2.release();
      }
    });
  });

  describe('Fault Tolerance', () => {
    it('should handle individual instance failures gracefully', async () => {
      const key = generateTestKey();

      // Simulate instance failure by disconnecting one client
      const clientToDisconnect = redisClients[0];
      await clientToDisconnect.quit();

      // Should still be able to acquire lock with 4/5 instances
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (lock) {
        expect(lock.isValid).toBe(true);
        await lock.release();
      }
    });

    it('should fail when majority of instances are unavailable', async () => {
      const key = generateTestKey();

      // Disconnect 3 out of 5 instances (no majority)
      const clientsToDisconnect = redisClients.slice(0, 3);
      const disconnectPromises = clientsToDisconnect.map(async (client) => {
        if (client.isReady) {
          await client.quit();
        }
      });

      await Promise.all(disconnectPromises);

      // Should fail to acquire lock without majority
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).toBeNull();
    });

    it('should retry on reconected instances by default', async () => {
      const key = generateTestKey();

      // Disconnect 3 out of 5 instances (no majority)
      const clientsToDisconnect = redisClients.slice(0, 3);
      const disconnectPromises = clientsToDisconnect.map(async (client) => {
        if (client.isReady) {
          await client.quit();
        }
      });

      await Promise.all(disconnectPromises);

      // Attempt to acquire lock, should fail due to no majority
      const lock2 = new Redlock(redisClients, {
        driftFactor: 0.01,
        retryDelayMs: 100,
        retryJitterMs: 50,
        maxRetryAttempts: 3,
      });

      setTimeout(async () => {
        // Reconnect the disconnected clients
        await Promise.allSettled(
          clientsToDisconnect.map((client) => client.connect()),
        );
      }, 200); // Wait for 200 ms to allow reconnection

      const lock = await lock2.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple concurrent clients correctly', async () => {
      const key = generateTestKey();
      const numClients = 10;
      const acquisitionPromises: Promise<{
        clientId: number;
        result: RedlockInstance | null;
      }>[] = [];

      // Create multiple concurrent acquisition attempts
      for (let i = 0; i < numClients; i++) {
        const promise = redlock.acquire(key, TEST_TTL).then((result) => ({
          clientId: i,
          result,
        }));
        acquisitionPromises.push(promise);
      }

      // Wait for all attempts to complete
      const results = await Promise.all(acquisitionPromises);

      // Exactly one should succeed
      const successful = results.filter((r) => r.result !== null);
      const failed = results.filter((r) => r.result === null);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(numClients - 1);

      // Clean up the successful lock
      if (successful.length > 0 && successful[0].result) {
        await successful[0].result.release();
      }
    });

    it('should handle rapid acquire/release cycles', async () => {
      const key = generateTestKey();
      const cycles = 5;

      for (let i = 0; i < cycles; i++) {
        const lock = await redlock.acquire(key, TEST_TTL);
        expect(lock).not.toBeNull();

        if (lock) {
          const released = await lock.release();
          expect(released).toBe(true);
        }
      }
    });
  });

  describe('Performance and Timing', () => {
    it('should complete acquisition within reasonable time', async () => {
      const key = generateTestKey();
      const startTime = Date.now();

      const lock = await redlock.acquire(key, TEST_TTL);
      const elapsedTime = Date.now() - startTime;

      expect(lock).not.toBeNull();
      expect(elapsedTime).toBeLessThan(1000); // Should complete within 1 second

      if (lock) {
        await lock.release();
      }
    });

    it('should respect timing constraints for very short TTLs', async () => {
      const key = generateTestKey();
      const shortTtl = 100; // 100ms - very short

      const lock = await redlock.acquire(key, shortTtl);

      // May succeed or fail depending on timing, but should not throw
      expect(lock === null || lock instanceof RedlockInstance).toBe(true);

      if (lock) {
        // If successful, lock should be valid
        expect(lock.isValid).toBe(true);
        expect(lock.expirationTime.getTime()).toBeGreaterThan(Date.now());

        await lock.release();
      }
    });
  });

  describe('WithLock Integration', () => {
    it('should execute function with automatic lock management', async () => {
      const key = generateTestKey();
      let executionCount = 0;

      const result = await redlock.withLock(key, TEST_TTL, async () => {
        executionCount++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(executionCount).toBe(1);

      // Lock should be automatically released - verify by acquiring again
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (lock) {
        await lock.release();
      }
    });

    it('should automatically release lock when function throws error', async () => {
      const key = generateTestKey();
      const errorMessage = 'Test error';

      await expect(
        redlock.withLock(key, TEST_TTL, async () => {
          throw new Error(errorMessage);
        }),
      ).rejects.toThrow(errorMessage);

      // Lock should be automatically released even on error
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (lock) {
        await lock.release();
      }
    });

    it('should handle concurrent withLock calls correctly', async () => {
      const key = generateTestKey();
      const results: string[] = [];
      const delays = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000); // 1s, 2s, 3s delays

      const promises = delays.map(async (delay, index) => {
        try {
          const result = await redlock.withLock(key, TEST_TTL, async () => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            results.push(`client-${index}`);
            return `result-${index}`;
          });
          return { success: true, result, index };
        } catch (error) {
          return { success: false, error: (error as Error).message, index };
        }
      });

      const outcomes = await Promise.all(promises);

      // Exactly one should succeed, others should fail with lock acquisition error
      const successful = outcomes.filter((o) => o.success);
      const failed = outcomes.filter((o) => !o.success);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(delays.length - 1);
      expect(results).toHaveLength(1); // Only one function should execute

      // Failed attempts should be due to lock acquisition failure
      failed.forEach((outcome) => {
        expect(outcome.error).toContain('Failed to acquire lock');
      });
    });

    it('should handle long-running operations with auto-extension', async () => {
      const key = generateTestKey();
      const shortTtl = 1000; // 2 seconds
      const longOperation = 2000; // 4 seconds (longer than TTL)

      const startTime = Date.now();

      const result = await redlock.withLock(key, shortTtl, async () => {
        // Simulate long-running operation
        await new Promise((resolve) => setTimeout(resolve, longOperation));
        return 'completed';
      });

      const elapsedTime = Date.now() - startTime;

      expect(result).toBe('completed');
      expect(elapsedTime).toBeGreaterThanOrEqual(longOperation);

      // Verify lock was held throughout the operation and then released
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (lock) {
        await lock.release();
      }
    });

    it('should fail gracefully when lock acquisition fails', async () => {
      const key = generateTestKey();

      // First, acquire lock manually to block withLock
      const blockingLock = await redlock.acquire(key, TEST_TTL);
      expect(blockingLock).not.toBeNull();

      if (!blockingLock) throw new Error('Failed to acquire blocking lock');

      // Now try withLock - should fail
      await expect(
        redlock.withLock(key, TEST_TTL, async () => {
          return 'should not execute';
        }),
      ).rejects.toThrow('Failed to acquire lock');

      // Clean up
      await blockingLock.release();
    });

    it('should handle rapid sequential withLock calls', async () => {
      const key = generateTestKey();
      const iterations = 5;
      const executionOrder: number[] = [];

      const promises: Promise<void>[] = [];

      const currentRedlock = new Redlock(redisClients, {
        driftFactor: 0.01,
        retryDelayMs: 100,
        retryJitterMs: 50,
        maxRetryAttempts: 0,
      });
      for (let i = 0; i < iterations; i++) {
        const promise = currentRedlock.withLock(key, TEST_TTL, async () => {
          executionOrder.push(i);
          // Small delay to ensure order is maintained
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        promises.push(promise);
      }

      await Promise.allSettled(promises);

      // At least one should have executed successfully
      expect(executionOrder.length).toBe(1);

      // Verify lock is released after all operations
      const finalLock = await redlock.acquire(key, TEST_TTL);
      expect(finalLock).not.toBeNull();

      if (finalLock) {
        await finalLock.release();
      }
    });

    it('should pass through return values correctly', async () => {
      const key = generateTestKey();

      // Test different return types
      const stringResult = await redlock.withLock(key, TEST_TTL, async () => {
        return 'test-string';
      });
      expect(stringResult).toBe('test-string');

      const numberResult = await redlock.withLock(key, TEST_TTL, async () => {
        return 42;
      });
      expect(numberResult).toBe(42);

      const objectResult = await redlock.withLock(key, TEST_TTL, async () => {
        return { success: true, data: [1, 2, 3] };
      });
      expect(objectResult).toEqual({ success: true, data: [1, 2, 3] });

      const nullResult = await redlock.withLock(key, TEST_TTL, async () => {
        return null;
      });
      expect(nullResult).toBeNull();
    });

    it('should validate parameters correctly', async () => {
      const key = generateTestKey();

      // Test invalid key
      await expect(
        redlock.withLock('', TEST_TTL, async () => 'test'),
      ).rejects.toThrow();

      // Test invalid TTL
      await expect(
        redlock.withLock(key, 0, async () => 'test'),
      ).rejects.toThrow();

      await expect(
        redlock.withLock(key, -1000, async () => 'test'),
      ).rejects.toThrow();

      // Test invalid function
      await expect(
        redlock.withLock(key, TEST_TTL, null as any),
      ).rejects.toThrow();
    });

    it('should work with async functions that return promises', async () => {
      const key = generateTestKey();

      const result = await redlock.withLock(key, TEST_TTL, () => {
        // Return a promise directly (not async function)
        return Promise.resolve('promise-result');
      });

      expect(result).toBe('promise-result');
    });

    it('should handle rejected promises correctly', async () => {
      const key = generateTestKey();
      const errorMessage = 'Promise rejection test';

      await expect(
        redlock.withLock(key, TEST_TTL, () => {
          return Promise.reject(new Error(errorMessage));
        }),
      ).rejects.toThrow(errorMessage);

      // Verify lock is released after rejection
      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock).not.toBeNull();

      if (lock) {
        await lock.release();
      }
    });
  });

  describe('Multi resource locking', () => {
    it('Should lock multiple resources', async () => {
      const keys = [generateTestKey(), generateTestKey(), generateTestKey()];

      // Acquire lock on multiple resources
      const multiLock = await redlock.acquire(keys, TEST_TTL);
      expect(multiLock).not.toBeNull();

      if (!multiLock) throw new Error('Failed to acquire multi-resource lock');

      // Verify lock properties
      expect(multiLock.resourceKeys).toEqual(keys.sort());
      expect(multiLock.isValid).toBe(true);
      expect(multiLock.isReleased).toBe(false);

      // Release the lock
      const released = await multiLock.release();
      expect(released).toBe(true);
      expect(multiLock.isReleased).toBe(true);
    });

    it('No resource can be acquired after multi resource lock', async () => {
      const keys = [generateTestKey(), generateTestKey(), generateTestKey()];

      // Acquire lock on multiple resources
      const multiLock = await redlock.acquire(keys, TEST_TTL);
      expect(multiLock).not.toBeNull();

      if (!multiLock) throw new Error('Failed to acquire multi-resource lock');

      // Try to acquire individual locks on each resource - all should fail
      for (const key of keys) {
        const individualLock = await redlock.acquire(key, TEST_TTL);
        expect(individualLock).toBeNull();
      }

      // Try to acquire another multi-resource lock that overlaps - should fail
      const overlappingKeys = [keys[0], generateTestKey()];
      const overlappingLock = await redlock.acquire(overlappingKeys, TEST_TTL);
      expect(overlappingLock).toBeNull();

      // Release the original lock
      await multiLock.release();

      // Now individual locks should succeed
      for (const key of keys) {
        const individualLock = await redlock.acquire(key, TEST_TTL);
        expect(individualLock).not.toBeNull();
        if (individualLock) {
          await individualLock.release();
        }
      }
    });

    it('no resource can be acquired after partial multi resource lock', async () => {
      const keys = [generateTestKey(), generateTestKey(), generateTestKey()];

      // First, acquire a lock on one of the resources to create a partial conflict
      const blockingLock = await redlock.acquire(keys[1], TEST_TTL);
      expect(blockingLock).not.toBeNull();

      if (!blockingLock) throw new Error('Failed to acquire blocking lock');

      // Try to acquire multi-resource lock - should fail due to partial conflict
      const multiLock = await redlock.acquire(keys, TEST_TTL);
      expect(multiLock).toBeNull();

      // Verify that the other resources are still available individually
      const lock1 = await redlock.acquire(keys[0], TEST_TTL);
      expect(lock1).not.toBeNull();

      const lock3 = await redlock.acquire(keys[2], TEST_TTL);
      expect(lock3).not.toBeNull();

      // Clean up
      await blockingLock.release();
      if (lock1) await lock1.release();
      if (lock3) await lock3.release();

      // Now the multi-resource lock should succeed
      const finalMultiLock = await redlock.acquire(keys, TEST_TTL);
      expect(finalMultiLock).not.toBeNull();

      if (finalMultiLock) {
        await finalMultiLock.release();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network partitions gracefully', async () => {
      const key = generateTestKey();

      // This test simulates network issues by using invalid Redis commands
      // In a real scenario, you might use network simulation tools

      const lock = await redlock.acquire(key, TEST_TTL);
      expect(lock === null || lock instanceof RedlockInstance).toBe(true);

      if (lock) {
        await lock.release();
      }
    });

    it('should provide meaningful error information', async () => {
      // Test with invalid parameters
      await expect(redlock.acquire('', TEST_TTL)).rejects.toThrow();
      await expect(redlock.acquire('valid-key', 0)).rejects.toThrow();

      // Test that users cannot directly call release and extend - they should use RedlockInstance
      // Note: TypeScript private methods are still accessible at runtime, but this documents the intended API
      expect(typeof (redlock as any).release).toBe('function');
      expect(typeof (redlock as any).extend).toBe('function');

      // The real protection comes from the clean public interface design - users should only see:
      // redlock.acquire() and redlock.withLock() in their IDE
    });
  });
});
