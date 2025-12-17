import { SnowflakeDecodeOptions, SnowflakeInfo } from './interfaces';
import { Snowflake } from './types';

export const decodeSnowflake = (snowflakeId: Snowflake, options?: SnowflakeDecodeOptions): SnowflakeInfo => {
  const id = BigInt(snowflakeId);

  const epoch = BigInt(options?.epoch ?? 1609459200000);
  const workerIdBits = BigInt(options?.workerIdBits ?? 5);
  const datacenterIdBits = BigInt(options?.datacenterIdBits ?? 5);
  const sequenceBits = BigInt(options?.sequenceBits ?? 12);

  const workerIdShift = sequenceBits;
  const datacenterIdShift = sequenceBits + workerIdBits;
  const timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;

  const sequenceMask = (1n << sequenceBits) - 1n;
  const workerIdMask = (1n << workerIdBits) - 1n;
  const datacenterIdMask = (1n << datacenterIdBits) - 1n;

  const sequence = id & sequenceMask;
  const workerId = (id >> workerIdShift) & workerIdMask;
  const datacenterId = (id >> datacenterIdShift) & datacenterIdMask;
  const timestamp = id >> timestampLeftShift;

  const timestampMs = timestamp + epoch;
  const date = new Date(Number(timestampMs));

  return {
    id,
    timestamp,
    timestampMs,
    date,
    workerId,
    datacenterId,
    sequence,
  };
};
