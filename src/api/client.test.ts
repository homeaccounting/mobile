import { mockFetch } from '../../test/fetch';
import { ApiClient, ApiError } from './client';

function makeClient(over: Partial<ConstructorParameters<typeof ApiClient>[0]> = {}) {
  return new ApiClient({
    getBaseUrl: () => 'http://localhost:8080',
    getToken: () => null,
    onUnauthorized: jest.fn(),
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

  it('calls onUnauthorized once on 401 and throws ApiError', async () => {
    const onUnauthorized = jest.fn();
    mockFetch(() => ({ status: 401, body: { message: 'bad creds' } }));
    await expect(makeClient({ onUnauthorized }).get('/api/x')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
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
