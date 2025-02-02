import { ArgumentMetadata, Injectable, Type, ValidationPipe } from '@nestjs/common';

@Injectable()
export class AbstractValidationPipe extends ValidationPipe {
  constructor(
    private readonly targetTypes: {
      body?: Type<any>;
      query?: Type<any>;
      param?: Type<any>;
      custom?: Type<any>;
    },
  ) {
    super({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      validateCustomDecorators: true,
      enableDebugMessages: true,
    });
  }

  override async transform(value: any, metadata: ArgumentMetadata) {
    const targetType = this.targetTypes[metadata.type] as Type<any>;

    if (!targetType) {
      return super.transform(value, metadata);
    }

    return super.transform(value, {
      ...metadata,
      metatype: targetType,
    });
  }
}
