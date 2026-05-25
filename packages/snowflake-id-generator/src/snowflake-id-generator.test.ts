import { describe, expect, test } from 'vitest';

import { decodeSnowflake } from './decode-snowflake-id';
import { getWorkerAndDatacenterId } from './get-worker-and-datacenter-id';
import { SnowflakeIdGenerator } from './snowflake-id-generator';

describe('SnowflakeIdGenerator', () => {
  test('generates a bigint id', () => {
    const generator = new SnowflakeIdGenerator(1n, 1n);
    const id = generator.nextId();
    expect(typeof id).toBe('bigint');
    expect(id).toBeGreaterThan(0n);
  });

  test('generates unique ids', () => {
    const generator = new SnowflakeIdGenerator(1n, 1n);
    const ids = new Set<bigint>();

    for (let i = 0; i < 1000; i++) {
      ids.add(generator.nextId());
    }

    expect(ids.size).toBe(1000);
  });

  test('generates monotonically increasing ids', () => {
    const generator = new SnowflakeIdGenerator(1n, 1n);
    let prev = generator.nextId();

    for (let i = 0; i < 100; i++) {
      const next = generator.nextId();
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  test('throws for invalid worker id', () => {
    expect(() => new SnowflakeIdGenerator(32n, 0n)).toThrow(
      "With 5 bits, worker id can't be greater than 31 or less than 0",
    );
    expect(() => new SnowflakeIdGenerator(-1n, 0n)).toThrow();
  });

  test('throws for invalid datacenter id', () => {
    expect(() => new SnowflakeIdGenerator(0n, 32n)).toThrow(
      "With 5 bits, datacenter id can't be greater than 31 or less than 0",
    );
    expect(() => new SnowflakeIdGenerator(0n, -1n)).toThrow();
  });

  test('exposes workerId and datacenterId', () => {
    const generator = new SnowflakeIdGenerator(3n, 7n);
    expect(generator.workerId).toBe(3n);
    expect(generator.datacenterId).toBe(7n);
  });

  test('uses default values for workerId and datacenterId', () => {
    const generator = new SnowflakeIdGenerator();
    expect(generator.workerId).toBe(0n);
    expect(generator.datacenterId).toBe(0n);
  });

  test('supports custom epoch', () => {
    const customEpoch = Date.now() - 1000;
    const generator = new SnowflakeIdGenerator(0n, 0n, { epoch: customEpoch });
    const id = generator.nextId();
    expect(id).toBeGreaterThan(0n);
  });

  test('tracks lastTimestamp', () => {
    const generator = new SnowflakeIdGenerator(0n, 0n);
    expect(generator.lastTimestamp).toBe(-1n);
    generator.nextId();
    expect(generator.lastTimestamp).toBeGreaterThan(0n);
  });
});

describe('decodeSnowflake', () => {
  test('round-trips with generator', () => {
    const workerId = 5n;
    const datacenterId = 10n;
    const generator = new SnowflakeIdGenerator(workerId, datacenterId);
    const id = generator.nextId();

    const decoded = decodeSnowflake(id);
    expect(decoded.id).toBe(id);
    expect(decoded.workerId).toBe(workerId);
    expect(decoded.datacenterId).toBe(datacenterId);
    expect(decoded.date).toBeInstanceOf(Date);
    expect(decoded.sequence).toBe(0n);
  });

  test('decodes sequence correctly for multiple ids in same ms', () => {
    const generator = new SnowflakeIdGenerator(1n, 1n);
    const id1 = generator.nextId();
    const id2 = generator.nextId();

    const decoded1 = decodeSnowflake(id1);
    const decoded2 = decodeSnowflake(id2);

    // If generated in the same millisecond, sequence should increment
    if (decoded1.timestamp === decoded2.timestamp) {
      expect(decoded2.sequence).toBe(decoded1.sequence + 1n);
    }
  });

  test('accepts number input', () => {
    const generator = new SnowflakeIdGenerator(0n, 0n);
    const id = generator.nextId();
    const decoded = decodeSnowflake(Number(id));
    expect(decoded.workerId).toBe(0n);
    expect(decoded.datacenterId).toBe(0n);
  });

  test('supports custom decode options', () => {
    const customEpoch = 1700000000000;
    const generator = new SnowflakeIdGenerator(1n, 1n, { epoch: customEpoch });
    const id = generator.nextId();

    const decoded = decodeSnowflake(id, { epoch: customEpoch });
    expect(decoded.workerId).toBe(1n);
    expect(decoded.datacenterId).toBe(1n);
  });
});

describe('getWorkerAndDatacenterId', () => {
  test('returns a tuple of two numbers', () => {
    const [workerId, datacenterId] = getWorkerAndDatacenterId();
    expect(typeof workerId).toBe('number');
    expect(typeof datacenterId).toBe('number');
    expect(workerId).toBeGreaterThanOrEqual(0);
    expect(workerId).toBeLessThan(32);
    expect(datacenterId).toBeGreaterThanOrEqual(0);
    expect(datacenterId).toBeLessThan(32);
  });
});
