import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

import { NumberFieldOptions } from '../interfaces';
import { ToArray } from './transform.decorator';

export const IsNumberField = (numberFieldOptions?: NumberFieldOptions) => {
  const options: NumberFieldOptions = {
    min: 1,
    required: true,
    each: false,
    max: Number.MAX_SAFE_INTEGER,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    int: true,
    positive: true,
    ...numberFieldOptions,
  };

  const decoratorsToApply = [
    Type(() => Number),
    Min(options.min, {
      each: options.each,
    }),
    Max(options.max, {
      each: options.each,
    }),
  ];

  if (options.int) {
    decoratorsToApply.push(
      IsInt({
        each: options.each,
      }),
    );
  } else {
    decoratorsToApply.push(
      IsNumber(
        {},
        {
          each: options.each,
        },
      ),
    );
  }

  if (options.positive) {
    decoratorsToApply.push(
      IsPositive({
        each: options.each,
      }),
    );
  }

  if (options.required) {
    decoratorsToApply.push(
      IsNotEmpty({
        each: options.each,
      }),
    );

    if (options.each) {
      decoratorsToApply.push(ArrayNotEmpty());
    }
  } else {
    decoratorsToApply.push(IsOptional());
  }

  if (options.each) {
    decoratorsToApply.push(
      ToArray(),
      IsArray(),
      ArrayMinSize(options.arrayMinSize),
      ArrayMaxSize(options.arrayMaxSize),
    );
  }

  return applyDecorators(...decoratorsToApply);
};
