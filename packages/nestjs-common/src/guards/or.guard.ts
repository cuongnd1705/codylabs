import { CanActivate, ExecutionContext, Inject, InjectionToken, Type, mixin } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { last, mergeMap, takeWhile } from 'rxjs/operators';

import { OrGuardOptions } from '../interfaces';
import { deferGuard, handleError } from '../utils';

export const OrGuard = (guards: Array<Type<CanActivate> | InjectionToken>, orGuardOptions?: OrGuardOptions) => {
  class OrMixinGuard implements CanActivate {
    private guards: CanActivate[] = [];

    constructor(
      @Inject(ModuleRef)
      private readonly moduleRef: ModuleRef,
    ) {}

    canActivate(context: ExecutionContext): Observable<boolean> {
      this.guards = guards.map((guard) => this.moduleRef.get(guard, { strict: false }));

      const canActivateReturns: Array<Observable<boolean>> = this.guards.map((guard) => deferGuard(guard, context));

      return from(canActivateReturns).pipe(
        mergeMap((obs) => obs.pipe(handleError(orGuardOptions?.throwOnFirstError))),
        takeWhile((val) => val === false, true),
        last(),
      );
    }
  }

  const Guard = mixin(OrMixinGuard);

  return Guard as Type<CanActivate>;
};
