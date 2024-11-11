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
    }),
    ToBoolean(),
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
