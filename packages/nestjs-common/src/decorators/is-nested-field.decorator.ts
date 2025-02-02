import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { NestedFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';

export const IsNestedField = (entity: any, nestedFieldOptions?: NestedFieldOptions) => {
  const options: NestedFieldOptions = {
    required: true,
    each: false,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...nestedFieldOptions,
  };

  const decoratorsToApply = [
    ValidateNested({
      each: options.each,
      message: 'The value must be a valid nested object',
    }),
    Type(() => entity),
  ];

  return applyCommonDecorators(options, decoratorsToApply);
};
