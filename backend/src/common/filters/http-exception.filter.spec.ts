import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

interface ErrorBody {
  errorCode: string;
  message: string;
  timestamp: string;
  traceId: string;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let status: jest.Mock;
  let sentBody: ErrorBody | undefined;

  /** Minimal ArgumentsHost double exposing just what the filter reads. */
  const hostWith = (request: Record<string, unknown>): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    }) as unknown as ArgumentsHost;

  /** Narrows away `undefined` so each test can assert without optional chaining. */
  const bodySentToClient = (): ErrorBody => {
    if (!sentBody) {
      throw new Error('filter did not send a response body');
    }
    return sentBody;
  };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    sentBody = undefined;
    // Capturing the body in the implementation keeps it strongly typed,
    // rather than digging an `any` out of mock.calls.
    const json = jest.fn((body: ErrorBody) => {
      sentBody = body;
    });
    status = jest.fn().mockReturnValue({ json });
    // The filter logs unhandled errors by design; keep the suite output clean.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps an HttpException to its own status and message', () => {
    filter.catch(
      new NotFoundException('File not found'),
      hostWith({ id: 'trace-123' }),
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(bodySentToClient()).toMatchObject({
      errorCode: 'NOT_FOUND',
      message: 'File not found',
      traceId: 'trace-123',
    });
  });

  it('flattens the array of messages a ValidationPipe produces', () => {
    filter.catch(
      new BadRequestException({
        message: ['name must be a string', 'size must be a number'],
      }),
      hostWith({ id: 'trace-123' }),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(bodySentToClient().message).toBe(
      'name must be a string, size must be a number',
    );
  });

  // The security-critical case: a driver error, a stack trace, or a
  // connection string must never reach the client.
  it('does not leak internals from an unexpected error', () => {
    filter.catch(
      new Error('connection to postgres://user:hunter2@db failed'),
      hostWith({ id: 'trace-123' }),
    );

    expect(status).toHaveBeenCalledWith(500);

    const body = bodySentToClient();
    expect(body).toMatchObject({
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('generates a traceId when the request has none', () => {
    filter.catch(new NotFoundException(), hostWith({}));

    expect(bodySentToClient().traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('emits an ISO-8601 timestamp', () => {
    filter.catch(new NotFoundException(), hostWith({ id: 'trace-123' }));

    const { timestamp } = bodySentToClient();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
