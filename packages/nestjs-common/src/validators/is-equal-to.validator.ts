import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsEqualToConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints as unknown[];
    const relatedValue = (args.object as Record<string, any>)[relatedPropertyName as string] as
      | string
      | boolean
      | number;

    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const property = args.property;
    const [relatedPropertyName] = args.constraints as unknown[];

    return `${property} should be equal to ${relatedPropertyName as string}`;
  }
}

export const IsEqualToField =
  <T = any>(property: keyof T, validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: Record<string, any>, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [property],
      validator: IsEqualToConstraint,
    });
  };
