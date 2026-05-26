import type { IThrottlerAlgorithm } from './interfaces';

import {
  FixedWindowAlgorithm,
  LeakyBucketPolicingAlgorithm,
  LeakyBucketShapingAlgorithm,
  SlidingWindowCounterAlgorithm,
  SlidingWindowLogAlgorithm,
  TokenBucketAlgorithm,
} from './algorithms';

export const ThrottlerAlgorithm = {
  FixedWindow: FixedWindowAlgorithm,
  SlidingWindowLog: SlidingWindowLogAlgorithm,
  SlidingWindowCounter: SlidingWindowCounterAlgorithm,
  TokenBucket: TokenBucketAlgorithm,
  LeakyBucketPolicing: LeakyBucketPolicingAlgorithm,
  LeakyBucketShaping: LeakyBucketShapingAlgorithm,
} as const satisfies Record<string, IThrottlerAlgorithm>;
