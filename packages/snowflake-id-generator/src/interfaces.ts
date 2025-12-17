import { Snowflake } from './types';

export interface SnowflakeIdGeneratorOptions {
  epoch?: Snowflake;
  workerIdBits?: Snowflake;
  datacenterIdBits?: Snowflake;
  sequence?: Snowflake;
  sequenceBits?: Snowflake;
}

export interface SnowflakeDecodeOptions {
  epoch?: Snowflake;
  workerIdBits?: Snowflake;
  datacenterIdBits?: Snowflake;
  sequenceBits?: Snowflake;
}

export interface SnowflakeInfo {
  id: bigint;
  timestamp: bigint;
  timestampMs: bigint;
  date: Date;
  workerId: bigint;
  datacenterId: bigint;
  sequence: bigint;
}
