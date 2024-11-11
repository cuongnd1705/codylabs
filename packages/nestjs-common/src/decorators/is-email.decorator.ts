import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

import { EmailFieldOptions } from '../interfaces';
import { normalizeEmail } from '../utils';
import { ToArray } from './transform.decorator';

export function IsEmailField(emailFieldOptions?: EmailFieldOptions) {
  const options: EmailFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...emailFieldOptions,
  };

  const decoratorsToApply = [
    Transform(({ value }: { value: string }) => value.toLowerCase(), { toClassOnly: true }),
    Transform(({ value }): string => (typeof value === 'string' ? normalizeEmail(value) : value), {
      toClassOnly: true,
    }),
    IsEmail(
      {},
      {
        each: options.each,
      },
    ),
  ];

  if (options.required) {
    decoratorsToApply.push(IsNotEmpty());

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
}
