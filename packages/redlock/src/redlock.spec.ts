import type { RedisClientType } from 'redis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidParameterError } from './errors.js';
import { Redlock } from './redlock.js';

// Helper to create mock Redis clients
function createMockRedisClient(isReady = true) {
  return {
    isReady,
    eval: vi.fn(),
  } as unknown as RedisClientType;
}

// Helper to create multiple mock clients
function createMockClients(count: number, allReady = true): RedisClientType[] {
  return Array.from({ length: count }, () => createMockRedisClient(allReady));
}

describe('Redlock', () => {
  let mockClients: RedisClientType[];
  let redlock: Redlock;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create 5 mock Redis clients (standard Redlock setup)
    mockClients = createMockClients(5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create Redlock instance with valid clients', () => {
      redlock = new Redlock(mockClients as RedisClientType[]);

      // Redlock instance should be created successfully
      expect(redlock).toBeInstanceOf(Redlock);
    });

    it('should throw error with empty client array', () => {
      const emptyClients: RedisClientType[] = [];

      expect(() => {
        new Redlock(emptyClients);
      }).toThrow(InvalidParameterError);
    });

    it('should validate drift factor option', () => {
      expect(() => {
        new Redlock(mockClients as RedisClientType[], { driftFactor: -0.1 });
      }).toThrow(InvalidParameterError);

      expect(() => {
        new Redlock(mockClients as RedisClientType[], { driftFactor: 0.2 });
      }).toThrow(InvalidParameterError);
    });

    it('should validate retry options', () => {
      expect(() => {
        new Redlock(mockClients as RedisClientType[], { retryDelayMs: -100 });
      }).toThrow(InvalidParameterError);

      expect(() => {
        new Redlock(mockClients as RedisClientType[], { maxRetryAttempts: -1 });
      }).toThrow(InvalidParameterError);
    });
  });

  describe('Timing Calculations', () => {
    beforeEach(() => {
      redlock = new Redlock(mockClients as RedisClientType[], {
        driftFactor: 0.01,
      });
    });

    it('should calculate effective validity correctly', () => {
      // Access private method for testing
      const calculateEffectiveValidity = (
        redlock as unknown as {
          calculateEffectiveValidity: (
            ttlMs: number,
            elapsedMs: number,
          ) => number;
        }
      ).calculateEffectiveValidity.bind(redlock);

      const ttlMs = 10000; // 10 seconds
      const elapsedMs = 1000; // 1 second

      // Expected: 10000 - 1000 - (0.01 * 10000) = 8900ms
      const result = calculateEffectiveValidity(ttlMs, elapsedMs);
      expect(result).toBe(8900);
    });

    it('should generate random retry delays', () => {
      redlock = new Redlock(mockClients as RedisClientType[], {
        retryDelayMs: 200,
        retryJitterMs: 100,
      });

      const generateRetryDelay = (
        redlock as unknown as { generateRetryDelay: () => number }
      ).generateRetryDelay.bind(redlock);

      const delay1 = generateRetryDelay();
      const delay2 = generateRetryDelay();

      // Should be between 200 and 300ms
      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(300);
      expect(delay2).toBeGreaterThanOrEqual(200);
      expect(delay2).toBeLessThanOrEqual(300);

      // Should be different (with high probability)
      expect(delay1).not.toBe(delay2);
    });
  });

  describe('Majority Consensus Logic', () => {
    beforeEach(() => {
      redlock = new Redlock(mockClients as RedisClientType[]);
    });

    it('should correctly identify majority consensus', () => {
      const hasMajorityConsensus = (
        redlock as unknown as {
          hasMajorityConsensus: (params: { successCount: number }) => boolean;
        }
      ).hasMajorityConsensus.bind(redlock);

      // With 5 instances, quorum is 3
      expect(hasMajorityConsensus({ successCount: 3 })).toBe(true);
      expect(hasMajorityConsensus({ successCount: 4 })).toBe(true);
      expect(hasMajorityConsensus({ successCount: 5 })).toBe(true);
      expect(hasMajorityConsensus({ successCount: 2 })).toBe(false);
      expect(hasMajorityConsensus({ successCount: 1 })).toBe(false);
      expect(hasMajorityConsensus({ successCount: 0 })).toBe(false);
    });

    it('should validate timing constraints', () => {
      const isTimingValid = (
        redlock as unknown as {
          isTimingValid: (params: {
            ttlMs: number;
            elapsedTime: number;
          }) => boolean;
        }
      ).isTimingValid.bind(redlock);

      // Valid timing (effective validity > 1ms)
      expect(isTimingValid({ ttlMs: 10000, elapsedTime: 1000 })).toBe(true);

      // Invalid timing (effective validity <= 1ms)
      expect(isTimingValid({ ttlMs: 1000, elapsedTime: 999 })).toBe(false);
      expect(isTimingValid({ ttlMs: 1000, elapsedTime: 1000 })).toBe(false);
    });

    it('should evaluate acquisition attempts correctly', () => {
      const evaluateAcquisitionAttempt = (
        redlock as unknown as {
          evaluateAcquisitionAttempt: (params: {
            successCount: number;
            ttlMs: number;
            elapsedTime: number;
          }) => {
            success: boolean;
            effectiveValidityMs?: number;
            failureReason?: string;
          };
        }
      ).evaluateAcquisitionAttempt.bind(redlock);

      // Successful attempt
      const successfulAttempt = {
        successCount: 3,
        ttlMs: 10000,
        elapsedTime: 1000,
      };

      const successResult = evaluateAcquisitionAttempt(successfulAttempt);
      expect(successResult.success).toBe(true);
      expect(successResult.effectiveValidityMs).toBe(8900); // 10000 - 1000 - 100

      // Failed attempt - insufficient consensus
      const failedConsensusAttempt = {
        successCount: 2,
        ttlMs: 10000,
        elapsedTime: 1000,
      };

      const consensusResult = evaluateAcquisitionAttempt(
        failedConsensusAttempt,
      );
      expect(consensusResult.success).toBe(false);
      expect(consensusResult.failureReason).toContain('Insufficient consensus');

      // Failed attempt - timing violation
      const failedTimingAttempt = {
        successCount: 3,
        ttlMs: 1000,
        elapsedTime: 999,
      };

      const timingResult = evaluateAcquisitionAttempt(failedTimingAttempt);
      expect(timingResult.success).toBe(false);
      expect(timingResult.failureReason).toContain(
        'Timing constraint violated',
      );
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(() => {
      redlock = new Redlock(mockClients as RedisClientType[]);
    });

    it('should validate token parameter', () => {
      const validateToken = (
        redlock as unknown as { validateToken: (token: unknown) => void }
      ).validateToken.bind(redlock);

      expect(() => validateToken('valid-token')).not.toThrow();
      expect(() => validateToken('')).toThrow(InvalidParameterError);
      expect(() => validateToken('   ')).toThrow(InvalidParameterError);
      expect(() => validateToken(null)).toThrow(InvalidParameterError);
      expect(() => validateToken(undefined)).toThrow(InvalidParameterError);
    });

    it('should validate TTL parameter', () => {
      const validateTtl = (
        redlock as unknown as { validateTtl: (ttl: unknown) => void }
      ).validateTtl.bind(redlock);

      expect(() => validateTtl(1000)).not.toThrow();
      expect(() => validateTtl(0)).toThrow(InvalidParameterError);
      expect(() => validateTtl(-1000)).toThrow(InvalidParameterError);
      expect(() => validateTtl(1.5)).toThrow(InvalidParameterError);
      expect(() => validateTtl('1000' as unknown)).toThrow(
        InvalidParameterError,
      );
    });
  });
});
