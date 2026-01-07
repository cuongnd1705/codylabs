import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { ErrorResponse } from '../interfaces';
import { isDevelopment } from '../utils';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const { message, details } = this.extractResponseData(exceptionResponse, exception);

    const error: ErrorResponse = {
      code: status,
      status: HttpStatus[status] as string,
      message,
    };

    if (details !== undefined) {
      error.details = details;
    }

    if (isDevelopment() && exception.stack) {
      error.details = {
        ...(typeof error.details === 'object' && error.details !== null ? error.details : {}),
        stack: exception.stack,
      };
    }

    response.status(status).json({
      error,
    });
  }

  private extractResponseData(
    exceptionResponse: string | object,
    exception: HttpException,
  ): { message: string; details?: any } {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
      };
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, any>;

      const message = Array.isArray(response.message)
        ? response.message.join(', ')
        : (response.message as string) || exception.message;

      const { message: _message, statusCode: _statusCode, ...details } = response;

      return {
        message,
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    }

    return {
      message: exception.message,
    };
  }
}
