import type { RedisClientType } from 'redis';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidParameterError } from './errors';
import { Redlock, RedlockInstance } from './redlock';

// Mock Redis client
const createMockRedisClient = (): RedisClientType =>
  ({
    eval: vi.fn().mockImplementation((script: string, options: { keys: string[] }) => {
      // ACQUIRE_SCRIPT and EXTEND_SCRIPT return 1 for success, 0 for failure
      // RELEASE_SCRIPT returns the count of keys released
      if (script.includes('MGET') || script.includes('SET')) {
        // This is likely EXTEND_SCRIPT or ACQUIRE_SCRIPT
        return Promise.resolve(1);
      } else {
        // This is likely RELEASE_SCRIPT - return count of keys
        return Promise.resolve(options.keys.length);
      }
    }),
    evalSha: vi.fn().mockRejectedValue(new Error('NOSCRIPT No matching script. Please use EVAL.')),
    quit: vi.fn().mockResolvedValue('OK'),
  }) as any;

describe('Redlock Multi-Resource Support', () => {
  let redlock: Redlock;
  let mockClients: RedisClientType[];

  beforeEach(() => {
    mockClients = [createMockRedisClient(), createMockRedisClient(), createMockRedisClient()];
    redlock = new Redlock(mockClients);
  });

  describe('acquire with multiple resources', () => {
    it('should acquire lock for multiple resources', async () => {
      const lock = await redlock.acquire(['user:123', 'order:456'], 5000);

      expect(lock).toBeInstanceOf(RedlockInstance);
      expect(lock?.resourceKeys).toEqual(['order:456', 'user:123']); // sorted
    });

    it('should sort resources lexicographically', async () => {
      const lock = await redlock.acquire(['zebra', 'alpha', 'beta'], 5000);

      expect(lock?.resourceKeys).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should deduplicate resources', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        return;
      });

      const lock = await redlock.acquire(['user:123', 'order:456', 'user:123'], 5000);

      expect(lock?.resourceKeys).toEqual(['order:456', 'user:123']);
      expect(consoleSpy).toHaveBeenCalledWith('Duplicate keys detected and removed:', ['user:123']);

      consoleSpy.mockRestore();
    });

    it('should handle single resource in array', async () => {
      const lock = await redlock.acquire(['user:123'], 5000);

      expect(lock?.resourceKeys).toEqual(['user:123']);
    });

    it('should throw error for empty array', async () => {
      await expect(redlock.acquire([], 5000)).rejects.toThrow(
        new InvalidParameterError('keys', [], 'non-empty array of strings'),
      );
    });

    it('should throw error for array with invalid keys', async () => {
      await expect(redlock.acquire(['valid', '', 'also-valid'], 5000)).rejects.toThrow(
        new InvalidParameterError('keys[1]', '', 'non-empty string'),
      );
    });

    it('should use multiple keys for Redis operations', async () => {
      await redlock.acquire(['user:123', 'order:456'], 5000);

      // Check that eval was called with multiple keys
      mockClients.forEach((client) => {
        expect(client.eval).toHaveBeenCalledWith(
          expect.any(String), // Lua script
          expect.objectContaining({
            keys: ['order:456', 'user:123'], // Multiple keys (sorted)
            arguments: expect.any(Array),
          }),
        );
      });
    });

    it('should handle acquisition failure', async () => {
      // Mock failure on majority of clients (return 0 for failure)
      Object.defineProperty(mockClients[0], 'eval', {
        value: vi.fn().mockResolvedValue(0),
        writable: true,
      });
      Object.defineProperty(mockClients[1], 'eval', {
        value: vi.fn().mockResolvedValue(0),
        writable: true,
      });
      Object.defineProperty(mockClients[2], 'eval', {
        value: vi.fn().mockResolvedValue(1),
        writable: true,
      }); // Success on one client

      const lock = await redlock.acquire(['user:123', 'order:456'], 5000);

      expect(lock).toBeNull();
    });
  });

  describe('withLock with multiple resources', () => {
    it('should execute function with multi-resource lock', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await redlock.withLock(['user:123', 'order:456'], 5000, mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should throw error if acquisition fails', async () => {
      // Mock failure on all clients
      mockClients.forEach((client) => {
        Object.defineProperty(client, 'eval', {
          value: vi.fn().mockResolvedValue(0),
          writable: true,
        });
      });

      const mockFn = vi.fn();

      await expect(redlock.withLock(['user:123', 'order:456'], 5000, mockFn)).rejects.toThrow(
        'Failed to acquire lock for resource: [user:123, order:456]',
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should release lock even if function throws', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'));

      // Mock successful acquisition and release
      mockClients.forEach((client) => {
        Object.defineProperty(client, 'eval', {
          value: vi
            .fn()
            .mockResolvedValueOnce(1) // acquire (success)
            .mockResolvedValueOnce(2), // release (2 keys released)
          writable: true,
        });
      });

      await expect(redlock.withLock(['user:123', 'order:456'], 5000, mockFn)).rejects.toThrow('Function error');

      // Verify release was called
      mockClients.forEach((client) => {
        expect(client.eval).toHaveBeenCalledTimes(2); // acquire + release
      });
    });

    it('should handle auto-extension with multiple resources', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        // Simulate long-running function
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      });

      const result = await redlock.withLock(['user:123', 'order:456'], 5000, mockFn, { extensionThresholdMs: 50 });

      expect(result).toBe('result');
    });
  });

  describe('backward compatibility', () => {
    it('should work with single string resource', async () => {
      const lock = await redlock.acquire('user:123', 5000);

      expect(lock).toBeInstanceOf(RedlockInstance);
      expect(lock?.resourceKeys).toEqual(['user:123']);
    });

    it('should work with single string in withLock', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await redlock.withLock('user:123', 5000, mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('RedlockInstance multi-resource behavior', () => {
    let lock: RedlockInstance;

    beforeEach(async () => {
      // Ensure mocks return success for acquisition
      mockClients.forEach((client) => {
        Object.defineProperty(client, 'eval', {
          value: vi.fn().mockImplementation((script: string, options: { keys: string[] }) => {
            // ACQUIRE_SCRIPT and EXTEND_SCRIPT return 1 for success
            // RELEASE_SCRIPT returns the count of keys
            if (script.includes('MGET') || script.includes('SET')) {
              return Promise.resolve(1);
            } else {
              return Promise.resolve(options.keys.length);
            }
          }),
          writable: true,
        });
      });

      lock = (await redlock.acquire(['user:123', 'order:456'], 5000))!;
    });

    it('should provide access to all resource keys', () => {
      expect(lock.resourceKeys).toEqual(['order:456', 'user:123']);
    });

    it('should release all resources', async () => {
      const result = await lock.release();

      expect(result).toBe(true);
      expect(lock.isReleased).toBe(true);

      // Verify release was called on all clients
      mockClients.forEach((client) => {
        expect(client.eval).toHaveBeenCalledWith(
          expect.any(String), // Release script
          expect.objectContaining({
            keys: ['order:456', 'user:123'],
            arguments: expect.any(Array),
          }),
        );
      });
    });

    it('should extend all resources', async () => {
      const result = await lock.extend(10000);

      expect(result).toBe(true);

      // Verify extend was called on all clients
      mockClients.forEach((client) => {
        expect(client.eval).toHaveBeenCalledWith(
          expect.any(String), // Extend script
          expect.objectContaining({
            keys: ['order:456', 'user:123'],
            arguments: expect.arrayContaining(['10000']),
          }),
        );
      });
    });

    it('should handle auto-extension for multiple resources', async () => {
      lock.startAutoExtension(1000);

      // Simulate time passing
      await new Promise((resolve) => setTimeout(resolve, 50));

      lock.stopAutoExtension();

      // Auto-extension should work with combined key
      expect(lock.isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should provide clear error messages for multi-resource failures', async () => {
      // Mock acquisition failure
      mockClients.forEach((client) => {
        Object.defineProperty(client, 'eval', {
          value: vi.fn().mockResolvedValue(0),
          writable: true,
        });
      });

      await expect(
        redlock.withLock(['user:123', 'order:456'], 5000, async () => {
          return;
        }),
      ).rejects.toThrow('Failed to acquire lock for resource: [user:123, order:456]');
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis error
      Object.defineProperty(mockClients[0], 'eval', {
        value: vi.fn().mockRejectedValue(new Error('Redis error')),
        writable: true,
      });
      Object.defineProperty(mockClients[1], 'eval', {
        value: vi.fn().mockResolvedValue(1), // Success
        writable: true,
      });
      Object.defineProperty(mockClients[2], 'eval', {
        value: vi.fn().mockResolvedValue(1), // Success
        writable: true,
      });

      const lock = await redlock.acquire(['user:123', 'order:456'], 5000);

      // Should still succeed with majority consensus
      expect(lock).toBeInstanceOf(RedlockInstance);
    });
  });

  describe('performance considerations', () => {
    it('should handle large numbers of resources efficiently', async () => {
      const manyResources = Array.from({ length: 100 }, (_, i) => `resource:${i}`);

      const lock = await redlock.acquire(manyResources, 5000);

      expect(lock).toBeInstanceOf(RedlockInstance);
      expect(lock?.resourceKeys).toHaveLength(100);

      // Should pass all keys to Redis
      mockClients.forEach((client) => {
        const calls = (client.eval as any).mock.calls;
        const lastCall = calls[calls.length - 1];
        const keys = lastCall[1].keys;

        expect(keys).toHaveLength(100);
        expect(keys).toEqual(manyResources.toSorted());
      });
    });

    it('should pass multiple keys directly to Redis', async () => {
      const lock = await redlock.acquire(['user:123', 'order:456'], 5000);

      expect(lock).toBeInstanceOf(RedlockInstance);

      // Should pass both keys to Redis
      mockClients.forEach((client) => {
        const calls = (client.eval as any).mock.calls;
        const lastCall = calls[calls.length - 1];
        const keys = lastCall[1].keys;

        expect(keys).toEqual(['order:456', 'user:123']);
      });
    });
  });
});
