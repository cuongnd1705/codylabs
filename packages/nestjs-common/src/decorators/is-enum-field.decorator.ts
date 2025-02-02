import { applyDecorators } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

import { EnumFieldOptions } from '../interfaces';
import { ToArray } from './transform.decorator';

export const IsEnumField = (entity: Record<string, string>, enumFieldOptions?: EnumFieldOptions) => {
  const options: EnumFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...enumFieldOptions,
  };

  const decoratorsToApply = [
    IsEnum(entity, {
      each: options.each,
      message: 'The value must be a valid enum value',
    }),
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
