import { applyDecorators } from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  MaxDate,
  MinDate,
} from 'class-validator';

import { DateFieldOptions } from '../interfaces';
import { ToArray } from './transform.decorator';

export const IsDateField = (dateFieldOptions?: DateFieldOptions) => {
  const options: DateFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    lessThan: false,
    greaterThan: false,
    ...dateFieldOptions,
  };

  const decoratorsToApply = [
    IsDateString(
      {
        strict: true,
      },
      {
        each: options.each,
      },
    ),
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

  if (options.greaterThan) {
    decoratorsToApply.push(MinDate(options.date));
  }

  if (options.lessThan) {
    decoratorsToApply.push(MaxDate(options.date));
  }

  return applyDecorators(...decoratorsToApply);
};
