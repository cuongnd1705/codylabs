import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsLowerThanConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints as unknown[];
    const relatedValue = (args.object as Record<string, string>)[relatedPropertyName as string] as string;

    return Number.parseFloat(value) < Number.parseFloat(relatedValue);
  }

  defaultMessage(args: ValidationArguments) {
    const property = args.property;
    const [relatedPropertyName] = args.constraints as unknown[];

    return `${property} should be lower than ${relatedPropertyName as string}`;
  }
}

export const IsLowerThan =
  <T = any>(property: keyof T, validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: Record<string, any>, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [property],
      validator: IsLowerThanConstraint,
    });
  };
