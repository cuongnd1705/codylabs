import { Inject, Injectable } from '@nestjs/common';

import { DEFAULT_REDIS_NAMESPACE, REDIS_CLIENTS } from '../constants';
import { Namespace, RedisClientConnectionType, RedisClients } from '../types';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENTS) private readonly clients: RedisClients) {}

  /**
   * Retrieves a redis connection by namespace.
   * However, if the query does not find a connection, it returns Error.
   *
   * @param namespace - The namespace
   * @returns A redis connection
   */
  getOrThrow(namespace: Namespace = DEFAULT_REDIS_NAMESPACE): RedisClientConnectionType {
    const client = this.clients.get(namespace);

    if (!client) {
      throw new Error(`No Connection found for namespace: ${String(namespace)}`);
    }

    return client;
  }

  /**
   * Retrieves a redis connection by namespace, if the query does not find a connection, it returns `null`;
   *
   * @param namespace - The namespace
   * @returns A redis connection or null
   */
  getOrNull(namespace: Namespace = DEFAULT_REDIS_NAMESPACE): RedisClientConnectionType | null {
    const client = this.clients.get(namespace);

    if (!client) {
      return null;
    }

    return client;
  }
}
