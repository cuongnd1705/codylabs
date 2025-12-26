import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { ErrorResponse } from '../interfaces';
import { isDev } from '../utils';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR];

    const error: ErrorResponse = {
      code: status,
      status: HttpStatus[status],
      message,
      ...(isDev() ? { details: exception.stack } : {}),
    };

    response.status(status).json({
      error,
    });
  }
}
