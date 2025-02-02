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
        },
      ),
    );
  } else if (options.base64) {
    decoratorsToApply.push(
      IsBase64(
        {},
        {
          each: options.each,
        },
      ),
    );
  } else {
    decoratorsToApply.push(
      IsString({
        each: options.each,
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
    decoratorsToApply.push(Matches(options.regex));
  }

  if (options.trim) {
    decoratorsToApply.push(Trim());
  }

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

  return applyDecorators(...decoratorsToApply);
};
