import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsAfterConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [comparisonDate] = args.constraints;

    if (!value || !comparisonDate) {
      return false;
    }

    const dateValue = new Date(value);
    const dateComparison = new Date(comparisonDate);

    if (Number.isNaN(dateValue.getTime()) || Number.isNaN(dateComparison.getTime())) {
      return false;
    }

    return dateValue > dateComparison;
  }

  defaultMessage(args: ValidationArguments) {
    const property = args.property;
    const [relatedPropertyName] = args.constraints as unknown[];

    return `${property} should be after ${relatedPropertyName as string}`;
  }
}

export const IsAfterField =
  <T = any>(property: keyof T, validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: Record<string, any>, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterConstraint,
    });
  };
