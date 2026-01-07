import { isEmpty, snake } from '@codylabs/helper-fns';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

import { ErrorResponse } from '../interfaces';
import { isDevelopment } from '../utils';

@Catch(UnprocessableEntityException)
export class UnprocessableEntityExceptionFilter implements ExceptionFilter<UnprocessableEntityException> {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost): void {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const statusCode: number = exception.getStatus();
    const exceptionResponse = exception.getResponse() as { message: ValidationError[] };
    const validationErrors: ValidationError[] = exceptionResponse.message;

    const processedErrors = this.processValidationErrors(validationErrors);

    response.status(statusCode).json({
      error: {
        code: statusCode,
        status: HttpStatus[statusCode],
        message: 'Validation failed',
        ...(isDevelopment() ? { details: processedErrors } : {}),
      } satisfies ErrorResponse,
    });
  }

  private processValidationErrors(validationErrors: ValidationError[]): ValidationError[] {
    return validationErrors.map((error) => this.cleanValidationError(error));
  }

  private cleanValidationError(validationError: ValidationError): ValidationError {
    const cleanedError: ValidationError = {
      ...validationError,
      target: undefined,
      children:
        validationError.children && !isEmpty(validationError.children)
          ? this.processValidationErrors(validationError.children)
          : undefined,
      constraints: this.processConstraints(validationError.constraints),
    };

    return cleanedError;
  }

  private processConstraints(constraints: Record<string, string> | undefined): Record<string, string> | undefined {
    if (!constraints) {
      return undefined;
    }

    return Object.entries(constraints).reduce(
      (acc, [key, value]) => {
        acc[key] = value || `error.fields.${snake(key)}`;

        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
