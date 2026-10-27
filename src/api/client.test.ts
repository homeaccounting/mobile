import { mockFetch } from '../../test/fetch';
import { ApiClient, ApiError, NetworkError } from './client';

function makeClient(over: Partial<ConstructorParameters<typeof ApiClient>[0]> = {}) {
  return new ApiClient({
    getBaseUrl: () => 'http://localhost:8080',
    getToken: () => null,
    refreshSession: jest.fn().mockResolvedValue(false),
    ...over,
  });
}

describe('ApiClient', () => {
  it('attaches Authorization when a token is present', async () => {
    const seen = mockFetch(() => ({ status: 200, body: {} }));
    await makeClient({ getToken: () => 'jwt-abc' }).get('/api/users/me');
    expect(seen[0]?.headers.get('authorization')).toBe('Bearer jwt-abc');
  });

  it('omits Authorization when there is no token', async () => {
    const seen = mockFetch(() => ({ status: 200, body: {} }));
    await makeClient().get('/api/x');
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });

  it('reads the base URL at request time', async () => {
    let base = 'https://a.example';
    const seen = mockFetch(() => ({ status: 200, body: {} }));
    const client = makeClient({ getBaseUrl: () => base });
    await client.get('/api/x');
    base = 'https://b.example';
    await client.get('/api/x');
    expect(seen.map((r) => r.url)).toEqual(['https://a.example/api/x', 'https://b.example/api/x']);
  });

  it('sends JSON bodies with a JSON content type', async () => {
    const seen = mockFetch(() => ({ status: 200, body: {} }));
    await makeClient().post('/api/x', { a: 1 });
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.body).toBe('{"a":1}');
    expect(seen[0]?.headers.get('content-type')).toBe('application/json');
  });

  it('parses JSON for 2xx', async () => {
    mockFetch(() => ({ status: 200, body: { value: 42 } }));
    await expect(makeClient().get('/api/x')).resolves.toEqual({ value: 42 });
  });

  it('returns undefined for an empty 200 (Servant NoContent)', async () => {
    mockFetch(() => ({ status: 200 }));
    await expect(makeClient().post('/api/x', {})).resolves.toBeUndefined();
  });

  it('parses message, code and fieldErrors from an error body', async () => {
    mockFetch(() => ({
      status: 400,
      body: { message: 'Validation failed', code: 'VALIDATION', fieldErrors: { name: 'Required' } },
    }));
    const err = (await makeClient()
      .post('/api/x', {})
      .catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(400);
    expect(err.message).toBe('Validation failed');
    expect(err.code).toBe('VALIDATION');
    expect(err.fieldErrors).toEqual({ name: 'Required' });
  });

  it('falls back to "HTTP <status>" when the error body is not JSON', async () => {
    mockFetch(() => ({ status: 503 }));
    const err = (await makeClient()
      .get('/api/x')
      .catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(503);
    expect(err.message).toBe('HTTP 503');
  });
});

describe('refresh on 401', () => {
  it('refreshes once and retries with the new token', async () => {
    let token = 'old';
    const refreshSession = jest.fn(() => {
      token = 'new';
      return Promise.resolve(true);
    });
    const seen = mockFetch((r) => ({
      status: r.headers.get('authorization') === 'Bearer new' ? 200 : 401,
      body: { v: 1 },
    }));
    const client = makeClient({ getToken: () => token, refreshSession });
    await expect(client.get('/api/x')).resolves.toEqual({ v: 1 });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(seen.map((r) => r.headers.get('authorization'))).toEqual(['Bearer old', 'Bearer new']);
  });

  it('shares one refresh between concurrent 401s', async () => {
    let token = 'old';
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const refreshSession = jest.fn(async () => {
      await gate;
      token = 'new';
      return true;
    });
    mockFetch((r) => ({
      status: r.headers.get('authorization') === 'Bearer new' ? 200 : 401,
      body: {},
    }));
    const client = makeClient({ getToken: () => token, refreshSession });
    const calls = [client.get('/a'), client.get('/b'), client.get('/c')];
    await Promise.resolve();
    release();
    await Promise.all(calls);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('retries without refreshing when the token already changed', async () => {
    let token = 'old';
    const refreshSession = jest.fn().mockResolvedValue(true);
    mockFetch((r) => {
      if (r.headers.get('authorization') === 'Bearer old') {
        token = 'new';
        return { status: 401 };
      }
      return { status: 200, body: {} };
    });
    await makeClient({ getToken: () => token, refreshSession }).get('/x');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('throws the original 401 when refresh fails', async () => {
    mockFetch(() => ({ status: 401 }));
    const err = await makeClient({ getToken: () => 't' })
      .get('/x')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });

  it('does not loop when the retry also gets 401', async () => {
    const refreshSession = jest.fn().mockResolvedValue(true);
    const seen = mockFetch(() => ({ status: 401 }));
    await makeClient({ getToken: () => 't', refreshSession })
      .get('/x')
      .catch(() => undefined);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
  });

  it('never refreshes or sends a token for auth:false', async () => {
    const refreshSession = jest.fn().mockResolvedValue(true);
    const seen = mockFetch(() => ({ status: 401 }));
    await makeClient({ getToken: () => 't', refreshSession })
      .post('/api/auth/login', {}, { auth: false })
      .catch(() => undefined);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });

  it('propagates a NetworkError thrown by refreshSession to the original request', async () => {
    const offline = new NetworkError();
    const refreshSession = jest.fn().mockRejectedValue(offline);
    mockFetch(() => ({ status: 401 }));
    const err = await makeClient({ getToken: () => 't', refreshSession })
      .get('/x')
      .catch((e: unknown) => e);
    expect(err).toBe(offline);
  });
});

describe('failures', () => {
  it('turns a fetch rejection into NetworkError', async () => {
    mockFetch(() => ({ reject: new TypeError('Network request failed') }));
    await expect(makeClient().get('/x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('times out into NetworkError', async () => {
    globalThis.fetch = jest.fn(
      (_i: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))),
        ),
    ) as typeof fetch;
    await expect(makeClient({ timeoutMs: 20 }).get('/x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('flags a non-JSON 2xx body as NOT_JSON', async () => {
    mockFetch(() => ({ status: 200, text: '<html>' }));
    const err = (await makeClient()
      .get('/x')
      .catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('NOT_JSON');
  });
});
