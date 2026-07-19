import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';

import { Inject, Injectable } from '@nestjs/common';

import type { ScheduleModuleOptions } from '../interfaces';

import { SCHEDULE_MODULE_OPTIONS } from '../constants';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

const CLAIM_SCRIPT = `
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'WITHSCORES', 'LIMIT', 0, 1)
if #jobs == 0 then return false end
redis.call('ZREM', KEYS[1], jobs[1])
return {jobs[1], jobs[2]}
`;

const CLAIM_WITH_LEASE_SCRIPT = `
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'WITHSCORES', 'LIMIT', 0, 1)
if #jobs == 0 then return false end
redis.call('ZREM', KEYS[1], jobs[1])
local claimId = jobs[1] .. ':' .. jobs[2]
local claim = cjson.encode({name = jobs[1], score = tonumber(jobs[2]), attempt = 0})
redis.call('ZADD', KEYS[2], ARGV[2], claimId)
redis.call('HSET', KEYS[3], claimId, claim)
return {jobs[1], jobs[2], claimId, '0'}
`;

const RECLAIM_EXPIRED_SCRIPT = `
local claims = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 1)
if #claims == 0 then return false end
local claimId = claims[1]
local raw = redis.call('HGET', KEYS[2], claimId)
if not raw then
  redis.call('ZREM', KEYS[1], claimId)
  return false
end
local claim = cjson.decode(raw)
claim.attempt = (claim.attempt or 0) + 1
redis.call('ZADD', KEYS[1], ARGV[2], claimId)
redis.call('HSET', KEYS[2], claimId, cjson.encode(claim))
return {claim.name, tostring(claim.score), claimId, tostring(claim.attempt)}
`;

const ACKNOWLEDGE_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
return 1
`;

const EXTEND_LEASE_SCRIPT = `
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  redis.call('ZADD', KEYS[1], 'XX', ARGV[2], ARGV[1])
  return 1
end
return 0
`;

// KEYS[1] = metaKey, KEYS[2] = jobsKey
// ARGV[1] = name, ARGV[2] = expression, ARGV[3] = nextTs
const REGISTER_SCRIPT = `
local stored = redis.call('HGET', KEYS[1], ARGV[1])
if stored ~= ARGV[2] then
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('ZADD', KEYS[2], tonumber(ARGV[3]), ARGV[1])
else
  redis.call('ZADD', KEYS[2], 'NX', tonumber(ARGV[3]), ARGV[1])
end
`;

@Injectable()
export class RedisJobStore {
  private readonly client: RedisClientLike;
  private readonly jobsKey: string;
  private readonly metaKey: string;
  private readonly processingKey: string;
  private readonly claimsKey: string;
  private readonly scriptShas = new Map<string, string>();
  readonly executionMode: 'at-most-once' | 'at-least-once';
  readonly leaseDuration: number;
  readonly maxRetries: number;

  constructor(@Inject(SCHEDULE_MODULE_OPTIONS) options: ScheduleModuleOptions) {
    this.client = options.client as RedisClientLike;
    const prefix = options.keyPrefix ?? 'scheduler';
    // The shared hash tag keeps all script keys in one Redis Cluster slot.
    this.jobsKey = `${prefix}:{schedule}:jobs`;
    this.metaKey = `${prefix}:{schedule}:meta`;
    this.processingKey = `${prefix}:{schedule}:processing`;
    this.claimsKey = `${prefix}:{schedule}:claims`;
    this.executionMode = options.executionMode ?? 'at-most-once';
    this.leaseDuration = options.leaseDuration ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Atomically registers a job on bootstrap.
   * If the expression changed: overwrites meta + ZADD unconditionally.
   * If the expression is unchanged: ZADD NX (preserves existing scheduled time).
   */
  async registerJob(name: string, expression: string, nextTs: number): Promise<void> {
    await this.execScript(REGISTER_SCRIPT, {
      keys: [this.metaKey, this.jobsKey],
      arguments: [name, expression, nextTs.toString()],
    });
  }

  /**
   * Atomically claims the next due job (score ≤ nowMs).
   * Returns the job name and its scheduled score if claimed, null otherwise.
   */
  async claimDueJob(
    nowMs: number,
  ): Promise<{ name: string; score: number; claimId?: string; attempt: number; retry: false } | null> {
    const leased = this.executionMode === 'at-least-once';
    const result = await this.execScript(leased ? CLAIM_WITH_LEASE_SCRIPT : CLAIM_SCRIPT, {
      keys: leased ? [this.jobsKey, this.processingKey, this.claimsKey] : [this.jobsKey],
      arguments: leased ? [nowMs.toString(), (nowMs + this.leaseDuration).toString()] : [nowMs.toString()],
    });

    if (!result) {
      return null;
    }

    const [name, scoreStr, claimId] = result as [string, string, string?];

    return {
      name,
      score: parseFloat(scoreStr),
      claimId,
      attempt: 0,
      retry: false,
    };
  }

  async reclaimExpiredJob(
    nowMs: number,
  ): Promise<{ name: string; score: number; claimId: string; attempt: number; retry: true } | null> {
    if (this.executionMode !== 'at-least-once') {
      return null;
    }
    const result = await this.execScript(RECLAIM_EXPIRED_SCRIPT, {
      keys: [this.processingKey, this.claimsKey],
      arguments: [nowMs.toString(), (nowMs + this.leaseDuration).toString()],
    });
    if (!result) {
      return null;
    }
    const [name, score, claimId, attempt] = result as [string, string, string, string];
    return { name, score: Number(score), claimId, attempt: Number(attempt), retry: true };
  }

  async acknowledgeJob(claimId: string): Promise<void> {
    await this.execScript(ACKNOWLEDGE_SCRIPT, {
      keys: [this.processingKey, this.claimsKey],
      arguments: [claimId],
    });
  }

  async extendLease(claimId: string, nowMs: number): Promise<boolean> {
    const result = await this.execScript(EXTEND_LEASE_SCRIPT, {
      keys: [this.processingKey],
      arguments: [claimId, (nowMs + this.leaseDuration).toString()],
    });
    return result === 1;
  }

  /**
   * Peeks at the earliest entry in the ZSET without removing it.
   */
  async peekNextJob(): Promise<{ name: string; score: number } | null> {
    const results = await this.client.zRangeWithScores(this.jobsKey, 0, 0);

    if (results.length === 0) {
      return null;
    }
    const { value, score } = results[0];

    return {
      name: value,
      score,
    };
  }

  /**
   * Re-enqueues a job with the given next timestamp (overwrites existing entry).
   */
  async enqueueJob(name: string, nextTs: number): Promise<void> {
    await this.client.zAdd(this.jobsKey, { score: nextTs, value: name });
  }

  /**
   * Returns current Redis server time in milliseconds.
   * Use this instead of Date.now() to avoid clock skew across instances.
   */
  async getTime(): Promise<number> {
    const [seconds, microseconds] = await this.client.time();
    return parseInt(seconds) * 1000 + Math.floor(parseInt(microseconds) / 1000);
  }

  /**
   * Removes a job from both the ZSET and the meta Hash.
   */
  async removeJob(name: string): Promise<void> {
    await Promise.all([this.client.zRem(this.jobsKey, name), this.client.hDel(this.metaKey, name)]);
  }

  private async execScript(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown> {
    let sha = this.scriptShas.get(script);
    if (!sha) {
      sha = await this.client.scriptLoad(script);
      this.scriptShas.set(script, sha);
    }
    try {
      return await this.client.evalSha(sha, options);
    } catch (error: unknown) {
      if ((error as Error)?.message?.includes('NOSCRIPT')) {
        this.scriptShas.delete(script);
        return await this.client.eval(script, options);
      }
      throw error;
    }
  }
}
