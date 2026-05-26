import type { IThrottlerAlgorithm } from '../interfaces/throttler-algorithm.interface';

export const FixedWindowAlgorithm: IThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = key .. ':block'
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local count = redis.call('INCR', key)

    if count == 1 then
      redis.call('PEXPIRE', key, ttl_ms)
    end

    local pttl = redis.call('PTTL', key)

    if count <= limit then
      return { count, pttl, -1, 0 }
    end

    if block_duration_ms > 0 then
      redis.call('SET', block_key, '1', 'PX', block_duration_ms)
      return { count, pttl, block_duration_ms, 1 }
    end

    return { count, pttl, -1, 0 }
  `,
};
