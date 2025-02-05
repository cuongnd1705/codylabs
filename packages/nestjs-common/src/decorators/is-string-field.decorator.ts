import { normalizeEmail } from '@codylabs/helper-fns';
import { Transform } from 'class-transformer';
import { IsBase64, IsEmail, IsNumberString, IsString, IsUrl, Matches } from 'class-validator';

import { StringFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';
import { MinMaxLength } from './min-max-length.decorator';
import { Trim } from './transform.decorator';

export const IsStringField = (stringFieldOptions?: StringFieldOptions) => {
  const options: StringFieldOptions = {
    required: true,
    numberString: false,
    base64: false,
    url: false,
    email: false,
    each: false,
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
  } else if (options.url) {
    decoratorsToApply.push(
      IsUrl(
        {},
        {
          each: options.each,
          message: 'The value must be a URL',
        },
      ),
    );
  } else if (options.email) {
    decoratorsToApply.push(
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

  return applyCommonDecorators(options, decoratorsToApply);
};
