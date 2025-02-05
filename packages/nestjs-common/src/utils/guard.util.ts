import { CanActivate, ExecutionContext } from '@nestjs/common';
import { defer, from, Observable, of, OperatorFunction, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export function deferGuard(guard: CanActivate, context: ExecutionContext): Observable<boolean> {
  return defer(() => {
    const guardVal = guard.canActivate(context);

    if (guardIsPromise(guardVal)) {
      return from(guardVal);
    }

    if (guardIsObservable(guardVal)) {
      return guardVal;
    }

    return of(guardVal);
  });
}

export function handleError(throwOnError?: boolean): OperatorFunction<boolean, boolean> {
  return catchError((err) => {
    if (throwOnError) {
      return throwError(() => err);
    }

    return of(false);
  });
}

export function guardIsPromise(guard: boolean | Promise<boolean> | Observable<boolean>): guard is Promise<boolean> {
  return !!(guard as Promise<boolean>).then;
}

export function guardIsObservable(guard: boolean | Observable<boolean>): guard is Observable<boolean> {
  return !!(guard as Observable<boolean>).pipe;
}
