import type { RedisClientType } from 'redis';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidParameterError } from './errors';
import { Redlock } from './redlock';

// Helper to create mock Redis clients
function createMockRedisClient(isReady = true) {
  return {
    isReady,
    eval: vi.fn(),
    evalSha: vi.fn().mockRejectedValue(new Error('NOSCRIPT No matching script. Please use EVAL.')),
    quit: vi.fn().mockResolvedValue('OK'),
  } as unknown as RedisClientType;
}

// Helper to create multiple mock clients for Redlock
function createMockClients(count: number, allReady = true): RedisClientType[] {
  return Array.from({ length: count }, () => createMockRedisClient(allReady));
}

describe('Redlock withLock functionality', () => {
  let mockClients: RedisClientType[];
  let redlock: Redlock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup multiple clients for Redlock
    mockClients = createMockClients(5);
    redlock = new Redlock(mockClients);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function and release lock on success', async () => {
    // Mock successful acquire on majority of instances
    mockClients.forEach((client) => {
      vi.mocked(client.eval)
        .mockResolvedValueOnce(1) // acquire success
        .mockResolvedValueOnce(1); // release success
    });

    const testFunction = vi.fn().mockResolvedValue('test result');

    const result = await redlock.withLock('test-key', 5000, testFunction);

    expect(result).toBe('test result');
    expect(testFunction).toHaveBeenCalledTimes(1);
    expect(testFunction).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('should release lock even when function throws', async () => {
    // Mock successful acquire on majority of instances
    mockClients.forEach((client) => {
      vi.mocked(client.eval)
        .mockResolvedValueOnce(1) // acquire success
        .mockResolvedValueOnce(1); // release success
    });

    const testError = new Error('Test error');
    const testFunction = vi.fn().mockRejectedValue(testError);

    await expect(redlock.withLock('test-key', 5000, testFunction)).rejects.toThrow('Test error');

    // Should still have attempted release on all instances
    mockClients.forEach((client) => {
      expect(client.eval).toHaveBeenCalledTimes(2);
    });
  });

  it('should throw error when lock acquisition fails', async () => {
    // Mock failed acquire on all instances
    mockClients.forEach((client) => {
      vi.mocked(client.eval).mockResolvedValueOnce(0); // acquire failed
    });

    const testFunction = vi.fn();

    await expect(redlock.withLock('test-key', 5000, testFunction)).rejects.toThrow('Failed to acquire lock');

    expect(testFunction).not.toHaveBeenCalled();
  });

  it('should handle auto-extension with extensionThresholdMs option', async () => {
    // Mock successful acquire and extension
    mockClients.forEach((client) => {
      vi.mocked(client.eval)
        .mockResolvedValueOnce(1) // acquire success
        .mockResolvedValueOnce(1) // extension success
        .mockResolvedValueOnce(1); // release success
    });

    const testFunction = vi.fn().mockResolvedValue('result');

    const result = await redlock.withLock('test-key', 5000, testFunction, {
      extensionThresholdMs: 1000,
    });

    expect(result).toBe('result');
    expect(testFunction).toHaveBeenCalledTimes(1);
    expect(testFunction).toHaveBeenCalledWith(expect.any(AbortSignal)); // signal passed from withLock
  });

  it('should validate ttlMs parameter', async () => {
    const testFunction = vi.fn();

    await expect(redlock.withLock('test-key', 5000.5, testFunction)).rejects.toThrow(InvalidParameterError);

    await expect(redlock.withLock('test-key', 0, testFunction)).rejects.toThrow(InvalidParameterError);

    await expect(redlock.withLock('test-key', -1000, testFunction)).rejects.toThrow(InvalidParameterError);
  });

  it('should validate function parameter', async () => {
    await expect(redlock.withLock('test-key', 5000, null as any)).rejects.toThrow(InvalidParameterError);

    await expect(redlock.withLock('test-key', 5000, 'not a function' as any)).rejects.toThrow(InvalidParameterError);
  });
});
