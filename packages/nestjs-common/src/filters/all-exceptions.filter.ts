import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { ErrorResponse } from '../interfaces';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.status ? exception.status : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message ? exception.message : HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR];

    const error: ErrorResponse = {
      code: status,
      status: HttpStatus[status],
      message,
    };

    response.status(status).json({
      error,
    });
  }
}
