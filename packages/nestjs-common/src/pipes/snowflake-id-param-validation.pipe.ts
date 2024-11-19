import { ArgumentMetadata, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class SnowflakeIdParamValidationPipe<T> implements PipeTransform {
  transform(value: T, metadata: ArgumentMetadata) {
    if (this.isEmpty(value)) {
      this.throwException(metadata.data, 'This field is required');
    }

    if (!this.isNumber(value)) {
      this.throwException(metadata.data, 'The value must be a number');
    }

    return value;
  }

  private isEmpty(value: T): boolean {
    return value === null || value === undefined;
  }

  private isNumber(value: T): boolean {
    return typeof value === 'number' || this.isNumberString(String(value));
  }

  private isNumberString(value: string): boolean {
    return !Number.isNaN(Number(value)) && value.trim() !== '';
  }

  private throwException(property: string, message: string): void {
    throw new UnprocessableEntityException([
      {
        property,
        constraints: {
          isNotEmpty: message,
        },
      },
    ]);
  }
}
