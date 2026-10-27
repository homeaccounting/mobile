import { mockFetch } from '../../test/fetch';
import { resetSecureStore } from '../../test/secureStore';
import { NetworkError } from '@/api/client';
import { createSessionStore } from './session';
import { createAppClient } from './api';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../../test/secureStore')>('../../test/secureStore')
      .secureStoreMock,
);

const pair = { token: 'a2', refreshToken: 'r2', userId: 'u', email: null, expiresIn: 3600 };

async function signedIn() {
  resetSecureStore();
  const store = createSessionStore();
  await store.load();
  await store.set({ serverUrl: 'https://h', accessToken: 'a1', refreshToken: 'r1' });
  return store;
}

describe('refreshSession', () => {
  it('stores the rotated pair and retries', async () => {
    const store = await signedIn();
    mockFetch((r) =>
      r.url.endsWith('/api/auth/refresh')
        ? { status: 200, body: pair }
        : r.headers.get('authorization') === 'Bearer a2'
          ? { status: 200, body: { ok: 1 } }
          : { status: 401 },
    );
    await expect(createAppClient(store).get('/api/accounts')).resolves.toEqual({ ok: 1 });
    expect(store.getSnapshot()).toMatchObject({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('keeps the session when the refresh response lacks a token pair', async () => {
    const store = await signedIn();
    mockFetch((r) =>
      r.url.endsWith('/api/auth/refresh')
        ? { status: 200, body: { token: 'a2' } }
        : { status: 401 },
    );
    await expect(createAppClient(store).get('/api/accounts')).rejects.toMatchObject({
      code: 'NOT_JSON',
    });
    expect(store.getSnapshot()).toEqual({
      serverUrl: 'https://h',
      accessToken: 'a1',
      refreshToken: 'r1',
    });
  });

  it('clears the session only on a 401 from /refresh', async () => {
    const store = await signedIn();
    mockFetch(() => ({ status: 401 }));
    await createAppClient(store)
      .get('/api/accounts')
      .catch(() => undefined);
    expect(store.getSnapshot()).toBeNull();
  });

  it('keeps the session when refresh hits a network error', async () => {
    const store = await signedIn();
    mockFetch((r) =>
      r.url.endsWith('/api/auth/refresh') ? { reject: new TypeError('offline') } : { status: 401 },
    );
    await expect(createAppClient(store).get('/api/accounts')).rejects.toBeInstanceOf(NetworkError);
    expect(store.getSnapshot()?.refreshToken).toBe('r1');
  });

  it('drops a refresh result after sign-out (no resurrection)', async () => {
    const store = await signedIn();
    let finish!: () => void;
    const gate = new Promise<void>((r) => (finish = r));
    mockFetch((r) =>
      r.url.endsWith('/api/auth/refresh') ? { status: 200, body: pair } : { status: 401 },
    );
    const inner = globalThis.fetch;
    globalThis.fetch = jest.fn((input: string, init?: RequestInit) =>
      input.endsWith('/api/auth/refresh')
        ? gate.then(() => inner(input, init))
        : inner(input, init),
    ) as typeof fetch;
    const call = createAppClient(store)
      .get('/api/accounts')
      .catch(() => undefined);
    await new Promise((r) => setTimeout(r, 0));
    await store.clear();
    finish();
    await call;
    expect(store.getSnapshot()).toBeNull();
  });
});
