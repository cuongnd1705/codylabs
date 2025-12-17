import { IsObject } from 'class-validator';

import type { ObjectFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';

export const IsObjectField = (objectFieldOptions?: ObjectFieldOptions) => {
  const options: ObjectFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...objectFieldOptions,
  };

  const decoratorsToApply = [
    IsObject({
      each: options.each,
    }),
  ];

  return applyCommonDecorators(options, decoratorsToApply);
};
