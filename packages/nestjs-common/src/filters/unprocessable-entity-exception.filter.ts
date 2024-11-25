import { isEmpty, snake } from '@codylabs/helper-fns';
import { ArgumentsHost, Catch, ExceptionFilter, UnprocessableEntityException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

@Catch(UnprocessableEntityException)
export class UnprocessableEntityExceptionFilter implements ExceptionFilter<UnprocessableEntityException> {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost): void {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const statusCode: number = exception.getStatus();
    const r = exception.getResponse() as { message: ValidationError[] };
    const validationErrors: ValidationError[] = r.message;

    this.processValidationErrors(validationErrors);

    response.status(statusCode).json(r);
  }

  private processValidationErrors(validationErrors: ValidationError[]): void {
    for (const validationError of validationErrors) {
      if (validationError.children && !isEmpty(validationError.children)) {
        this.processValidationErrors(validationError.children);
      }

      validationError.target = undefined;
      validationError.children = undefined;

      if (validationError.constraints) {
        for (const [constraintKey, constraint] of Object.entries(validationError.constraints)) {
          if (!constraint) {
            validationError.constraints[constraintKey] = `error.fields.${snake(constraintKey)}`;
          }
        }
      }
    }
  }
}
