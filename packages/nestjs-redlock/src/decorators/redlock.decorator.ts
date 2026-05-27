import type { WithLockOptions } from '@codylabs/redlock';

import { Inject } from '@nestjs/common';

import { REDLOCK_SERVICE_KEY } from '../constants';
import { RedlockService } from '../services';

export function Redlock<T extends (...args: any[]) => any>(
  key: string | string[],
  ttl: number,
  options?: WithLockOptions,
): (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void {
  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(`@Redlock can only be applied to methods. Property ${String(propertyKey)} is not a method.`);
    }

    Inject(RedlockService)(target, REDLOCK_SERVICE_KEY as unknown as string);

    const originalMethod = descriptor.value;

    const wrappedMethod = async function (this: any, ...args: any[]) {
      const redlockService = (this as any)[REDLOCK_SERVICE_KEY] as RedlockService;

      if (!redlockService) {
        throw new Error(
          `RedlockService not found. Ensure the RedlockModule is imported in the same module as the class using @Redlock or isGlobal is true`,
        );
      }

      const fn = () => originalMethod.apply(this, args);
      if (Array.isArray(key)) {
        return await redlockService.withLock(key, ttl, fn, options);
      } else {
        return await redlockService.withLock(key, ttl, fn, options);
      }
    };

    Object.defineProperty(wrappedMethod, 'name', {
      value: originalMethod.name,
      configurable: true,
    });

    Object.defineProperty(wrappedMethod, 'length', {
      value: originalMethod.length,
      configurable: true,
    });

    const originalPropertyNames = Object.getOwnPropertyNames(originalMethod);
    for (const propName of originalPropertyNames) {
      if (propName !== 'name' && propName !== 'length' && propName !== 'prototype') {
        try {
          const propDescriptor = Object.getOwnPropertyDescriptor(originalMethod, propName);
          if (propDescriptor) {
            Object.defineProperty(wrappedMethod, propName, propDescriptor);
          }
        } catch {
          // Some properties may not be configurable — skip silently
        }
      }
    }

    descriptor.value = wrappedMethod as T;
    return descriptor;
  };
}
