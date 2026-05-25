/**
 * Creates a Redis client injection token.
 *
 * @param connectionName - Optional connection name
 * @returns Injection token for the Redis client
 * @throws Error if connectionName is an empty string
 * @publicApi
 */
export function RedisToken(connectionName?: string): string {
  if (connectionName === '') {
    throw new Error('Redis connection name cannot be an empty string. Use undefined for the default connection.');
  }

  if (connectionName) {
    return `REDIS_CLIENT_${connectionName.toUpperCase()}`;
  }

  return 'REDIS_CLIENT';
}
