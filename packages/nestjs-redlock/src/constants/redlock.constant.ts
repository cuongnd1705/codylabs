/**
 * Symbol used as the DI property key to inject RedlockService into decorated classes.
 * Exported so that tests can use it to manually mock the service.
 * @internal
 */
export const REDLOCK_SERVICE_KEY = Symbol('redlockService');
