import { applyDecorators } from '@nestjs/common';
import { MaxLength, MinLength } from 'class-validator';

import { MinMaxLengthOptions } from '../interfaces';

export const MinMaxLength = (minMaxLengthOptions?: MinMaxLengthOptions) => {
  const options = {
    minLength: 1,
    maxLength: 500,
    each: false,
    ...minMaxLengthOptions,
  } satisfies MinMaxLengthOptions;

  const decoratorsToApply = [
    MinLength(options.minLength, {
      each: options.each,
      message: `The value must be at least ${options.minLength} characters long`,
    }),
    MaxLength(options.maxLength, {
      each: options.each,
      message: `The value must be no more than ${options.maxLength} characters long`,
    }),
  ];

  return applyDecorators(...decoratorsToApply);
};
