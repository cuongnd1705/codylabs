import { applyDecorators } from '@nestjs/common';
import { MaxLength, MinLength } from 'class-validator';

import { MinMaxLengthOptions } from '../interfaces';

export const MinMaxLength = (minMaxLengthOptions?: MinMaxLengthOptions) => {
  const options = {
    minLength: 1,
    maxLength: 500,
    each: false,
    ...minMaxLengthOptions,
  };

  const decoratorsToApply = [
    MinLength(options.minLength, {
      each: options.each,
    }),
    MaxLength(options.maxLength, {
      each: options.each,
    }),
  ];

  return applyDecorators(...decoratorsToApply);
};
