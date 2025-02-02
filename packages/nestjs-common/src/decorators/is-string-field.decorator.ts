import { applyDecorators } from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBase64,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { StringFieldOptions } from '../interfaces';
import { MinMaxLength } from './min-max-length.decorator';
import { ToArray, Trim } from './transform.decorator';

export const IsStringField = (stringFieldOptions?: StringFieldOptions) => {
  const options: StringFieldOptions = {
    required: true,
    numberString: false,
    base64: false,
    each: false,
    sanitize: false,
    trim: false,
    minLength: 1,
    maxLength: Number.MAX_SAFE_INTEGER,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...stringFieldOptions,
  };

  const decoratorsToApply = [];

  if (options.numberString) {
    decoratorsToApply.push(
      IsNumberString(
        {},
        {
          each: options.each,
          message: 'The value must be a number string',
        },
      ),
    );
  } else if (options.base64) {
    decoratorsToApply.push(
      IsBase64(
        {},
        {
          each: options.each,
          message: 'The value must be a base64 string',
        },
      ),
    );
  } else {
    decoratorsToApply.push(
      IsString({
        each: options.each,
        message: 'The value must be a string',
      }),
    );
  }

  decoratorsToApply.push(
    MinMaxLength({
      minLength: options.minLength,
      maxLength: options.maxLength,
      each: options.each,
    }),
  );

  if (options.regex) {
    decoratorsToApply.push(
      Matches(options.regex, {
        message: 'The value does not match the required pattern',
      }),
    );
  }

  if (options.trim) {
    decoratorsToApply.push(Trim());
  }

  if (options.required) {
    decoratorsToApply.push(
      IsNotEmpty({
        each: options.each,
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
};
