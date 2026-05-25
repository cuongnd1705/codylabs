import { Inject } from '@nestjs/common';

import { RedisToken } from '../constants/tokens';

export const InjectRedis = (connectionName?: string) => Inject(RedisToken(connectionName));
