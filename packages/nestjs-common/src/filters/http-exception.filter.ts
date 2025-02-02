import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response<any, Record<string, any>> = ctx.getResponse<Response>();

    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message: string =
      exception instanceof HttpException ? exception.message : HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR];

    response.status(status).json({
      statusCode: status,
      message,
      error: {
        stack: exception.stack,
      },
    });
  }
}
