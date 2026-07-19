import type { Type } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';

import type { RedisLogger } from './types';

import { RedisModule } from './redis.module';

const createLogger = (): RedisLogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});

describe('RedisModule connection logging', () => {
  it('keeps loggers isolated between named module instances', async () => {
    const firstLogger = createLogger();
    const secondLogger = createLogger();
    const firstDefinition = RedisModule.forRoot({ connectionName: 'first', logger: firstLogger });
    const secondDefinition = RedisModule.forRoot({ connectionName: 'second', logger: secondLogger });
    const FirstModule = firstDefinition.module as Type<RedisModule>;
    const SecondModule = secondDefinition.module as Type<RedisModule>;
    const firstQuit = jest.fn().mockResolvedValue(undefined);
    const secondQuit = jest.fn().mockResolvedValue(undefined);
    const firstRef = { get: jest.fn().mockReturnValue({ quit: firstQuit }) } as unknown as ModuleRef;
    const secondRef = { get: jest.fn().mockReturnValue({ quit: secondQuit }) } as unknown as ModuleRef;

    await new FirstModule(firstRef).onApplicationShutdown();
    await new SecondModule(secondRef).onApplicationShutdown();

    expect(firstLogger.log).toHaveBeenCalledWith('[Connection=first]: Redis connection closed');
    expect(secondLogger.log).toHaveBeenCalledWith('[Connection=second]: Redis connection closed');
    expect(firstLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('second'));
    expect(secondLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('first'));
  });
});
