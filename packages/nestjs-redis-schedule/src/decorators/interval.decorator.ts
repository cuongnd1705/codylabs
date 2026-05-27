import { SetMetadata, applyDecorators } from '@nestjs/common';

import { SCHEDULER_NAME, SCHEDULER_TYPE, SCHEDULE_INTERVAL_OPTIONS } from '../constants';
import { SchedulerType } from '../enums';

/**
 * Schedules an interval (`setInterval`).
 */
export function Interval(timeout: number): MethodDecorator;
/**
 * Schedules an interval (`setInterval`).
 */
export function Interval(name: string, timeout: number): MethodDecorator;
/**
 * Schedules an interval (`setInterval`).
 */
export function Interval(nameOrTimeout: string | number, timeout?: number): MethodDecorator {
  const [name, intervalTimeout] =
    typeof nameOrTimeout === 'string' ? [nameOrTimeout, timeout] : [undefined, nameOrTimeout];

  return applyDecorators(
    SetMetadata(SCHEDULE_INTERVAL_OPTIONS, { timeout: intervalTimeout }),
    SetMetadata(SCHEDULER_NAME, name),
    SetMetadata(SCHEDULER_TYPE, SchedulerType.INTERVAL),
  );
}
