import { CanActivate, ExecutionContext, Inject, InjectionToken, Type, mixin } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { concatMap, defaultIfEmpty, filter, take } from 'rxjs/operators';

import { SequentialGuardOptions } from '../interfaces';
import { deferGuard, handleError } from '../utils';

export const SequentialGuard = (
  guards: Array<Type<CanActivate> | InjectionToken>,
  sequentialGuardOptions?: SequentialGuardOptions,
) => {
  class SequentialMixinGuard implements CanActivate {
    private guards: CanActivate[] = [];

    constructor(
      @Inject(ModuleRef)
      private readonly moduleRef: ModuleRef,
    ) {}

    canActivate(context: ExecutionContext): Observable<boolean> {
      this.guards = guards.map((guard) => this.moduleRef.get(guard, { strict: false }));

      const canActivateReturns: Array<Observable<boolean>> = this.guards.map((guard) => deferGuard(guard, context));

      return from(canActivateReturns).pipe(
        concatMap((obs) => obs.pipe(handleError(sequentialGuardOptions?.throwOnError))),
        filter((value) => value === true),
        defaultIfEmpty(false),
        take(1),
      );
    }
  }

  const Guard = mixin(SequentialMixinGuard);

  return Guard as Type<CanActivate>;
};
