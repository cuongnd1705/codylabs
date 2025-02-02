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
    }),
  ];

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
