import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class UpdateSelectiveValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { updateMask } = request.query;
    const dto = request.body as Record<string, unknown>;

    if (!updateMask || updateMask === '*' || !dto) {
      return next.handle();
    }

    if (typeof updateMask !== 'string') {
      throw new BadRequestException('updateMask must be a string');
    }

    const validFields = this.getValidFields(updateMask, dto);
    request.body = this.filterObject(dto, validFields);

    return next.handle().pipe(
      map((response) => {
        if (!response || typeof response !== 'object') {
          return response;
        }
        return this.filterObject(response as Record<string, unknown>, validFields);
      }),
    );
  }

  private getValidFields(updateMask: string, dto: Record<string, unknown>): Set<string> {
    const fields = updateMask
      .split(',')
      .map((field) => field.trim())
      .filter((field) => field && field in dto);

    if (!fields.length) {
      throw new BadRequestException('No valid fields specified in updateMask');
    }

    return new Set(fields);
  }

  private filterObject(obj: Record<string, unknown>, fields: Set<string>): Record<string, unknown> {
    return Object.fromEntries(
      Array.from(fields)
        .filter((field) => field in obj)
        .map((field) => [field, obj[field]]),
    );
  }
}
