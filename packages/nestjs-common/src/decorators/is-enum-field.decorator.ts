import { IsEnum } from 'class-validator';

import { EnumFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';

export const IsEnumField = (entity: Record<string, string>, enumFieldOptions?: EnumFieldOptions) => {
  const options = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...enumFieldOptions,
  } satisfies EnumFieldOptions;

  const decoratorsToApply = [
    IsEnum(entity, {
      each: options.each,
      message: 'The value must be a valid enum value',
    }),
  ];

  return applyCommonDecorators(options, decoratorsToApply);
};
