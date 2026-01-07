import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { ErrorResponse } from '../interfaces';
import { isDevelopment } from '../utils';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Error) {
      const error: ErrorResponse = {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        status: HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR],
        message: isDevelopment() ? exception.message : 'Internal server error',
      };

      if (isDevelopment()) {
        error.details = {
          name: exception.name,
          ...(exception.stack && { stack: exception.stack }),
        };
      }

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error,
      });

      return;
    }

    const error: ErrorResponse = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      status: HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR],
      message: HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR],
    };

    if (isDevelopment()) {
      error.details = {
        type: typeof exception,
        value: exception,
      };
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error,
    });
  }
}
