import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

import { NumberFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';

export const IsNumberField = (numberFieldOptions?: NumberFieldOptions) => {
  const options = {
    min: 0,
    required: true,
    each: false,
    max: Number.MAX_SAFE_INTEGER,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    int: false,
    positive: false,
    ...numberFieldOptions,
  } satisfies NumberFieldOptions;

  const decoratorsToApply = [
    Type(() => Number),
    Min(options.min, {
      each: options.each,
      message: `The value must be at least ${options.min}`,
    }),
    Max(options.max, {
      each: options.each,
      message: `The value must be no more than ${options.max}`,
    }),
  ];

  if (options.int) {
    decoratorsToApply.push(
      IsInt({
        each: options.each,
        message: 'The value must be an integer',
      }),
    );
  } else {
    decoratorsToApply.push(
      IsNumber(
        {},
        {
          each: options.each,
          message: 'The value must be a number',
        },
      ),
    );
  }

  if (options.positive) {
    decoratorsToApply.push(
      IsPositive({
        each: options.each,
        message: 'The value must be positive',
      }),
    );
  }

  return applyCommonDecorators(options, decoratorsToApply);
};
