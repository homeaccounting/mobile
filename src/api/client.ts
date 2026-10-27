import type { ApiErrorShape } from './types';

interface ApiClientOptions {
  getBaseUrl: () => string;
  getToken: () => string | null;
  /** Rotate tokens after a 401. Resolves true when a new access token is stored. */
  refreshSession: () => Promise<boolean>;
  timeoutMs?: number;
}

export interface RequestOpts {
  /** false: no Authorization header and no refresh (auth endpoints). */
  auth?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = shape.status;
    this.code = shape.code;
    this.fieldErrors = shape.fieldErrors;
  }
}

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private readonly opts: ApiClientOptions) {}

  get<T>(path: string, opts?: RequestOpts): Promise<T> {
    return this.request<T>(path, { method: 'GET' }, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      opts,
    );
  }

  private refreshOnce(): Promise<boolean> {
    this.refreshing ??= this.opts.refreshSession().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async send(path: string, init: RequestInit, token: string | null): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    if (init.body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      return await fetch(`${this.opts.getBaseUrl()}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (e) {
      throw new NetworkError(e);
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(path: string, init: RequestInit, opts?: RequestOpts): Promise<T> {
    const auth = opts?.auth !== false;
    const sent = auth ? this.opts.getToken() : null;
    let res = await this.send(path, init, sent);

    if (res.status === 401 && auth && sent) {
      const current = this.opts.getToken();
      if (current && current !== sent) {
        res = await this.send(path, init, current);
      } else if (await this.refreshOnce()) {
        const token = this.opts.getToken();
        if (token) res = await this.send(path, init, token);
      }
    }

    if (!res.ok) {
      const body = await safeReadErrorBody(res);
      throw new ApiError({
        status: res.status,
        message: body.message ?? `HTTP ${res.status}`,
        code: body.code,
        fieldErrors: body.fieldErrors,
      });
    }

    // Servant's `Post '[JSON] NoContent` returns 200 with an empty body, not 204.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError({ status: res.status, message: 'Response is not JSON', code: 'NOT_JSON' });
    }
  }
}

async function safeReadErrorBody(res: Response): Promise<{
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}> {
  try {
    const data = (await res.json()) as {
      message?: string;
      code?: string;
      fieldErrors?: Record<string, string>;
      error?: string;
    };
    return { message: data.message ?? data.error, code: data.code, fieldErrors: data.fieldErrors };
  } catch {
    return {};
  }
}
