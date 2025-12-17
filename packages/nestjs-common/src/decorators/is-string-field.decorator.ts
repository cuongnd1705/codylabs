import { IsBase64, IsEmail, IsNumberString, IsString, IsUrl, Matches } from 'class-validator';

import { StringFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';
import { MinMaxLength } from './min-max-length.decorator';
import { Trim } from './transform.decorator';

export const IsStringField = (stringFieldOptions?: StringFieldOptions) => {
  const options = {
    required: true,
    numberString: false,
    base64: false,
    url: false,
    each: false,
    sanitize: false,
    trim: false,
    email: false,
    minLength: 1,
    maxLength: Number.MAX_SAFE_INTEGER,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    ...stringFieldOptions,
  } satisfies StringFieldOptions;

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
