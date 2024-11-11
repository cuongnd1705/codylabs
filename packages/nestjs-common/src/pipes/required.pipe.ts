import { ArgumentMetadata, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class RequiredPipe<T> implements PipeTransform {
  transform(value: T, metadata: ArgumentMetadata) {
    if (value === null || value === undefined) {
      throw new UnprocessableEntityException();
    }

    return value;
  }
}
