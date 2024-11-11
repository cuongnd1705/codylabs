import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

export type DateFormats =
  | 'yyyy-MM-dd' // ISO 8601 Format
  | 'dd/MM/yyyy'
  | 'MM/dd/yyyy'
  | 'yyyy-MM-dd HH:mm:ss' // Full Date and Time (Timestamp)
  | 'yyyy-MM-dd' // Date Only
  | 'yyyy/MM/dd' // Alternate Date Format
  | 'yyyy.MM.dd' // Alternate Date Format
  | 'MM-dd-yyyy' // Alternate Date Format
  | 'dd MMM yyyy' // Alternate Date Format
  | 'yyyy-MM-ddTHH:mm:ss' // ISO Date-Time Format
  | "yyyy-MM-dd'T'HH:mm:ss.SSSZ"; // ISO Date-Time String Format

const dateFormatRegex: Record<DateFormats, RegExp> = {
  'yyyy-MM-dd': /^\d{4}-\d{2}-\d{2}$/,
  'dd/MM/yyyy': /^\d{2}\/\d{2}\/\d{4}$/,
  'MM/dd/yyyy': /^\d{2}\/\d{2}\/\d{4}$/,
  'yyyy-MM-dd HH:mm:ss': /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  'yyyy/MM/dd': /^\d{4}\/\d{2}\/\d{2}$/,
  'yyyy.MM.dd': /^\d{4}\.\d{2}\.\d{2}$/,
  'MM-dd-yyyy': /^\d{2}-\d{2}-\d{4}$/,
  'dd MMM yyyy': /^\d{2} \w{3} \d{4}$/,
  'yyyy-MM-ddTHH:mm:ss': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
  "yyyy-MM-dd'T'HH:mm:ss.SSSZ": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
};

@ValidatorConstraint({ async: false })
class IsDateInFormatConstraint implements ValidatorConstraintInterface {
  validate(value: string | string[], args: ValidationArguments) {
    const [format] = args.constraints as DateFormats[];

    if (!dateFormatRegex[format]) {
      return false;
    }

    const regex = dateFormatRegex[format];

    if (Array.isArray(value)) {
      return value.some((v) => regex.test(v));
    }

    return regex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    const property = args.property;
    const [format] = args.constraints as string[];

    return `${property} should be in ${format} format`;
  }
}

export const IsDateInFormat =
  (format: DateFormats, validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: Record<string, any>, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [format],
      validator: IsDateInFormatConstraint,
    });
  };
