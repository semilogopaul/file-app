import env from "@/config/env";

/**
 * The error envelope the backend returns for every failure.
 * @see backend/src/common/filters/http-exception.filter.ts
 */
interface ApiErrorBody {
  readonly errorCode: string;
  readonly message: string;
  readonly traceId?: string;
}

/**
 * A failed API call, carrying enough context for the UI to react
 * differently to "your session expired" vs "that name is taken".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly traceId?: string;

  constructor({
    status,
    errorCode,
    message,
    traceId,
  }: {
    status: number;
    errorCode: string;
    message: string;
    traceId?: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.traceId = traceId;
  }

  /** The session is gone - the UI should send the user to sign in. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Raised when the request never reached the server at all. */
export class NetworkError extends Error {
  constructor() {
    // Written for a person, not a developer: this string is shown in the UI.
    super("Can't reach istore. Check your connection and try again.");
    this.name = "NetworkError";
  }
}

interface RequestOptions {
  readonly method?: "GET" | "POST" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

/**
 * Thin fetch wrapper for the istore API.
 *
 * Notably absent: any token handling. The session is an httpOnly cookie set
 * by the backend, and because nginx serves the app and the API from one
 * origin the browser attaches it automatically. `credentials: "include"`
 * covers the local-development case where the two run on different ports.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // An aborted request is the caller cancelling deliberately (a
    // superseded search, an unmounted component) - not a failure to report.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new NetworkError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError({
      status: response.status,
      errorCode: errorBody.errorCode ?? "UNKNOWN_ERROR",
      // Falls back rather than showing "undefined" if the body is unreadable.
      message: errorBody.message ?? "Something went wrong. Please try again.",
      traceId: errorBody.traceId,
    });
  }

  return payload as T;
}
