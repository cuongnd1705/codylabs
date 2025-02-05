import { CanActivate, ExecutionContext, Inject, InjectionToken, mixin, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { from, Observable } from 'rxjs';
import { concatMap, every, last, mergeMap } from 'rxjs/operators';

import { AndGuardOptions } from '../interfaces';
import { deferGuard, handleError } from '../utils';

export const AndGuard = (guards: (Type<CanActivate> | InjectionToken)[], andGuardOptions?: AndGuardOptions) => {
  class AndMixinGuard implements CanActivate {
    private guards: CanActivate[] = [];

    constructor(
      @Inject(ModuleRef)
      private readonly moduleRef: ModuleRef,
    ) {}

    canActivate(context: ExecutionContext): Observable<boolean> {
      this.guards = guards.map((guard) => this.moduleRef.get(guard, { strict: false }));

      const canActivateReturns: (() => Observable<boolean>)[] = this.guards.map(
        (guard) => () => deferGuard(guard, context),
      );
      const mapOperator = andGuardOptions?.sequential ? concatMap : mergeMap;

      return from(canActivateReturns).pipe(
        mapOperator((obs) => obs().pipe(handleError(andGuardOptions?.throwOnFirstError))),
        every((val) => val === true),
        last(),
      );
    }
  }

  const Guard = mixin(AndMixinGuard);

  return Guard as Type<CanActivate>;
};
