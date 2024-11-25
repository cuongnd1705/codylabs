import { IsDateString, MaxDate, MinDate } from 'class-validator';

import { DateFieldOptions } from '../interfaces';
import { applyCommonDecorators } from '../utils';

export const IsDateField = (dateFieldOptions?: DateFieldOptions) => {
  const options: DateFieldOptions = {
    each: false,
    required: true,
    arrayMinSize: 0,
    arrayMaxSize: Number.MAX_SAFE_INTEGER,
    lessThan: false,
    greaterThan: false,
    ...dateFieldOptions,
  };

  const decoratorsToApply = [
    IsDateString(
      {
        strict: true,
      },
      {
        each: options.each,
        message: 'The value must be a valid date string',
      },
    ),
  ];

  if (options.greaterThan) {
    decoratorsToApply.push(
      MinDate(options.date, {
        message: `The date must be after ${options.date}`,
      }),
    );
  }

  if (options.lessThan) {
    decoratorsToApply.push(
      MaxDate(options.date, {
        message: `The date must be before ${options.date}`,
      }),
    );
  }

  return applyCommonDecorators(options, decoratorsToApply);
};
