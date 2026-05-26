import type { IThrottlerAlgorithm } from '../interfaces/throttler-algorithm.interface';

export const SlidingWindowCounterAlgorithm: IThrottlerAlgorithm = {
  script: `
    local key = KEYS[1]
    local block_key = key .. ':block'
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local time = redis.call('TIME')
    local now_ms = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

    local current_window = math.floor(now_ms / ttl_ms)
    local previous_window = current_window - 1
    local elapsed = (now_ms % ttl_ms) / ttl_ms

    local current_key = key .. ':' .. current_window
    local previous_key = key .. ':' .. previous_window

    local prev_count = tonumber(redis.call('GET', previous_key) or '0') or 0
    local current_count = tonumber(redis.call('GET', current_key) or '0') or 0

    local weighted_prev = prev_count * (1 - elapsed)
    local estimated = weighted_prev + current_count

    if estimated >= limit then
      local retry_ms = math.ceil(ttl_ms * (1 - elapsed))
      if block_duration_ms > 0 then
        redis.call('SET', block_key, '1', 'PX', block_duration_ms)
        return { limit + 1, retry_ms, block_duration_ms, 1 }
      end
      return { limit + 1, retry_ms, -1, 0 }
    end

    local new_count = redis.call('INCR', current_key)

    if new_count == 1 then
      redis.call('PEXPIRE', current_key, ttl_ms * 2)
    end

    return { new_count, redis.call('PTTL', current_key), -1, 0 }
  `,
};
