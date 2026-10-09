import { mockFetch } from '../../test/fetch';
import { ApiClient } from './client';
import { authApi } from './auth';
import { accountsApi } from './accounts';
import { promptApi } from './prompt';

const client = new ApiClient({
  getBaseUrl: () => 'http://localhost:8080',
  getToken: () => 't',
  onUnauthorized: () => {},
});

const auth = { token: 'jwt', userId: 'u1', email: 'a@b.c', expiresIn: 3600 };

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
