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
        message: 'The value must be a valid email address',
      },
    ),
  ];

  if (options.required) {
    decoratorsToApply.push(
      IsNotEmpty({
        message: 'This field is required',
      }),
    );

    if (options.each) {
      decoratorsToApply.push(
        ArrayNotEmpty({
          message: 'The array must not be empty',
        }),
      );
    }
  } else {
    decoratorsToApply.push(
      IsOptional({
        message: 'This field is optional',
      }),
    );
  }

  if (options.each) {
    decoratorsToApply.push(
      ToArray(),
      IsArray({
        message: 'The value must be an array',
      }),
      ArrayMinSize(options.arrayMinSize, {
        message: `The array must contain at least ${options.arrayMinSize} items`,
      }),
      ArrayMaxSize(options.arrayMaxSize, {
        message: `The array must contain no more than ${options.arrayMaxSize} items`,
      }),
    );
  }

  return applyDecorators(...decoratorsToApply);
}
