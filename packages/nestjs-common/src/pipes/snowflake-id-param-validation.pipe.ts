import { ArgumentMetadata, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class SnowflakeIdParamValidationPipe<T> implements PipeTransform {
  transform(value: T, metadata: ArgumentMetadata) {
    if (value === null || value === undefined) {
      throw new UnprocessableEntityException([
        {
          property: metadata.data,
          constraints: {
            isNotEmpty: 'this field is required',
          },
        },
      ]);
    }

    if (typeof value !== 'number' && !this.isNumberString(String(value))) {
      throw new UnprocessableEntityException([
        {
          property: metadata.data,
          constraints: {
            isDataType: 'this field must be a number',
          },
        },
      ]);
    }

    return value;
  }

  private isNumberString(value: string): boolean {
    return !Number.isNaN(Number(value)) && value.trim() !== '';
  }
}
