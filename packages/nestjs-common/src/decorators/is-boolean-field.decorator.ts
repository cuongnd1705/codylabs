import { applyDecorators } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

import { BooleanFieldOptions } from '../interfaces';
import { ToArray, ToBoolean } from './transform.decorator';

export const IsBooleanField = (booleanFieldOptions?: BooleanFieldOptions) => {
  const options: BooleanFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...booleanFieldOptions,
  };

  const decoratorsToApply = [
    IsBoolean({
      each: options.each,
      message: 'The value must be a boolean',
    }),
    ToBoolean(),
  ];

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
