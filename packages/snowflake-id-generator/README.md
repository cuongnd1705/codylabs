# Snowflake ID Generator

A TypeScript implementation of Twitter's Snowflake ID generation algorithm. This package provides a distributed unique ID generator that creates 64-bit IDs based on timestamp, worker ID, datacenter ID, and sequence numbers.

## Features

- 64-bit unique ID generation
- Configurable epoch
- Supports worker and datacenter IDs for distributed systems
- Zero dependencies
- Written in TypeScript with full type safety

## Installation

```sh
# npm
npm install @codylabs/snowflake-id-generator

# yarn
yarn add @codylabs/snowflake-id-generator

# pnpm
pnpm add @codylabs/snowflake-id-generator
```

## Usage

### Basic usage

```ts
import { SnowflakeGenerator } from '@codylabs/snowflake-id-generator';

// Create a new generator instance
const generator = new SnowflakeIdGenerator();

// Generate a new ID
const id = generator.nextId();
console.log(id.toString()); // Example: "1234567890123456789"
```

### Advanced configuration:

```ts
const generator = new SnowflakeIdGenerator(1n, 1n, {
  epoch: 1609459200000n, // Custom epoch (default: 2021-01-01)
  workerIdBits: 5n,      // Bits allocated for worker ID
  datacenterIdBits: 5n,  // Bits allocated for datacenter ID
  sequenceBits: 12n,     // Bits allocated for sequence
  sequence: 0n           // Starting sequence number
});
```

### API Reference

SnowflakeIdGenerator

**Constructor**

```ts
constructor(
  workerId: Snowflake = 0n,
  datacenterId: Snowflake = 0n,
  options?: SnowflakeIdGeneratorOptions
)
```

**Options**

```ts
interface SnowflakeIdGeneratorOptions {
  epoch?: Snowflake;           // Custom epoch timestamp
  workerIdBits?: Snowflake;    // Number of bits for worker ID
  datacenterIdBits?: Snowflake; // Number of bits for datacenter ID
  sequence?: Snowflake;         // Starting sequence number
  sequenceBits?: Snowflake;     // Number of bits for sequence
}
```

**Methods**

- `nextId(): bigint` - Generates and returns the next unique ID
- `tilNextMillis(lastTimestamp: bigint): bigint` - Internal method to wait for next millisecond

**Properties**

- `workerId: bigint` - Gets the current worker ID
- `datacenterId: bigint` - Gets the current datacenter ID
- `currentSequence: bigint` - Gets the current sequence number
- `lastTimestamp: bigint` - Gets the last timestamp used


### ID Structure

The generated ID is a 64-bit integer with the following structure:

```
+-------------+------------------+----------------+-----------------+
| Timestamp   | Datacenter ID    | Worker ID      | Sequence        |
| 41 bits     | 5 bits           | 5 bits         | 12 bits         |
+-------------+------------------+----------------+-----------------+
```