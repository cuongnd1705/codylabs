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

  if (options.required) {
    decoratorsToApply.push(
      IsNotEmpty({
        each: options.each,
        message: 'This field is required',
      }),
    );

    if (options.each) {
      decoratorsToApply.push(
        ArrayNotEmpty({
          message: 'The array must not be empty',
        }),
      );
    }
  } else {
    decoratorsToApply.push(
      IsOptional({
        message: 'This field is optional',
      }),
    );
  }

  if (options.each) {
    decoratorsToApply.push(
      ToArray(),
      IsArray({
        message: 'The value must be an array',
      }),
      ArrayMinSize(options.arrayMinSize, {
        message: `The array must contain at least ${options.arrayMinSize} items`,
      }),
      ArrayMaxSize(options.arrayMaxSize, {
        message: `The array must contain no more than ${options.arrayMaxSize} items`,
      }),
    );
  }

  return applyDecorators(...decoratorsToApply);
};
