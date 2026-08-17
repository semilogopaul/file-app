import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  readonly errorCode: string;
  readonly message: string;
  readonly timestamp: string;
  readonly traceId: string;
}

/**
 * Catches everything (HttpException subclasses and unhandled errors alike)
 * and normalizes them into the standard envelope from SOP Section 8.1.
 * Non-HttpException errors are logged with full detail server-side but never
 * leak their internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const status = this.resolveStatus(exception);
    const { errorCode, message } = this.resolveErrorDetails(exception, status);
    const traceId = request.id ?? randomUUID();

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception [traceId=${traceId}]: ${this.stringifyUnknown(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseBody = {
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      traceId,
    };

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveErrorDetails(
    exception: unknown,
    status: number,
  ): { errorCode: string; message: string } {
    if (exception instanceof HttpException) {
      const message =
        this.extractMessage(exception.getResponse()) ?? exception.message;
      return { errorCode: HttpStatus[status] ?? 'UNKNOWN_ERROR', message };
    }

    // Never forward raw error internals (stack traces, driver errors, etc.)
    // to the client - only into the server-side log above.
    return {
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  private extractMessage(payload: unknown): string | undefined {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message: string | string[] };
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return undefined;
  }

  private stringifyUnknown(exception: unknown): string {
    return exception instanceof Error ? exception.message : String(exception);
  }
}
