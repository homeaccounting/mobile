import { mockFetch } from '../../test/fetch';
import { ApiClient } from './client';
import { authApi } from './auth';
import { accountsApi } from './accounts';
import { promptApi } from './prompt';

const client = new ApiClient({
  getBaseUrl: () => 'http://localhost:8080',
  getToken: () => 't',
  refreshSession: () => Promise.resolve(false),
});

const auth = { token: 'jwt', refreshToken: 'rt', userId: 'u1', email: 'a@b.c', expiresIn: 3600 };

describe('authApi', () => {
  it('logs in with POST /api/auth/login', async () => {
    const seen = mockFetch(() => ({ status: 200, body: auth }));
    await expect(authApi(client).login({ email: 'a@b.c', password: 'pw' })).resolves.toEqual(auth);
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/login');
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({ email: 'a@b.c', password: 'pw' });
  });

  it('registers with POST /api/auth/register', async () => {
    const seen = mockFetch(() => ({ status: 200, body: auth }));
    await authApi(client).register({ email: 'a@b.c', password: 'pw' });
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/register');
    expect(seen[0]?.method).toBe('POST');
  });

  it('refreshes with POST /api/auth/refresh and no Authorization', async () => {
    const seen = mockFetch(() => ({ status: 200, body: auth }));
    await authApi(client).refresh({ refreshToken: 'rt' });
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/refresh');
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({ refreshToken: 'rt' });
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });

  it('logs out with POST /api/auth/logout and no Authorization', async () => {
    const seen = mockFetch(() => ({ status: 200 }));
    await authApi(client).logout({ refreshToken: 'rt' });
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/logout');
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({ refreshToken: 'rt' });
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });

  it('signs in with an ID token via POST /api/auth/oauth/:provider/id-token', async () => {
    const seen = mockFetch(() => ({ status: 200, body: auth }));
    await expect(
      authApi(client).idTokenSignIn('apple', { idToken: 'jwt', rawNonce: 'raw' }),
    ).resolves.toEqual(auth);
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/oauth/apple/id-token');
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({ idToken: 'jwt', rawNonce: 'raw' });
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });

  it('lists providers with GET /api/auth/providers', async () => {
    const body = { password: true, google: true, apple: false };
    const seen = mockFetch(() => ({ status: 200, body }));
    await expect(authApi(client).providers()).resolves.toEqual(body);
    expect(seen[0]?.url).toBe('http://localhost:8080/api/auth/providers');
    expect(seen[0]?.method).toBe('GET');
    expect(seen[0]?.headers.get('authorization')).toBeNull();
  });
});

describe('accountsApi', () => {
  it('unwraps the account list envelope', async () => {
    const account = {
      id: 'a1',
      name: 'Cash',
      balance: 100,
      currency: 'UAH',
      overdraftLimit: null,
      subtype: null,
      status: 'Opened',
      role: 'owner',
      version: 1,
    };
    const seen = mockFetch(() => ({ status: 200, body: { accounts: [account], totalCount: 1 } }));
    await expect(accountsApi(client).list()).resolves.toEqual([account]);
    expect(seen[0]?.url).toBe('http://localhost:8080/api/accounts');
  });
});

describe('promptApi', () => {
  it('POSTs the text to /api/prompt and returns the envelope', async () => {
    const seen = mockFetch(() => ({
      status: 200,
      body: { kind: 'transactions', succeeded: [], failed: [{ index: 0, reason: 'no amount' }] },
    }));
    const res = await promptApi(client).submit({ text: 'coffee' });
    expect(JSON.parse(seen[0]?.body ?? '')).toEqual({ text: 'coffee' });
    expect(res.failed).toEqual([{ index: 0, reason: 'no amount' }]);
  });
});
