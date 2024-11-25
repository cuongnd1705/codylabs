import { IsBoolean } from 'class-validator';

import { BooleanFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';
import { ToBoolean } from './transform.decorator';

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

  return applyCommonDecorators(options, decoratorsToApply);
};
