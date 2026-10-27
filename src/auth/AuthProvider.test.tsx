import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { mockFetch } from '../../test/fetch';
import { resetSecureStore } from '../../test/secureStore';
import { queryClient } from '@/lib/queryClient';
import { createSessionStore } from './session';
import { AuthProvider, useAuth } from './AuthProvider';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../../test/secureStore')>('../../test/secureStore')
      .secureStoreMock,
);

const pair = { token: 'a', refreshToken: 'r', userId: 'u', email: 'e@x.io', expiresIn: 3600 };
const stored = { 'ha.serverUrl': 'https://h', 'ha.accessToken': 'a', 'ha.refreshToken': 'r' };

async function setup(seed: Record<string, string> = {}) {
  resetSecureStore(seed);
  const store = createSessionStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider store={store}>{children}</AuthProvider>
  );
  const hook = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.status).not.toBe('loading'));
  return { store, hook };
}

describe('AuthProvider', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts signed out with an empty keystore', async () => {
    const { hook } = await setup();
    expect(hook.result.current.status).toBe('signedOut');
  });

  it('starts signed in with a stored session', async () => {
    const { hook } = await setup(stored);
    expect(hook.result.current.status).toBe('signedIn');
  });

  it('signs in and stores the session for that server', async () => {
    const { store, hook } = await setup();
    const seen = mockFetch(() => ({ status: 200, body: pair }));
    await act(() =>
      hook.result.current.signIn({ email: 'e@x.io', password: 'pw', serverUrl: 'https://h' }),
    );
    expect(hook.result.current.status).toBe('signedIn');
    expect(store.getSnapshot()).toEqual({
      serverUrl: 'https://h',
      accessToken: 'a',
      refreshToken: 'r',
    });
    expect(seen[0]?.url).toBe('https://h/api/auth/login');
  });

  it('rejects an insecure server URL without a request', async () => {
    const { store, hook } = await setup();
    const seen = mockFetch(() => ({ status: 200, body: pair }));
    await expect(
      act(() =>
        hook.result.current.signIn({
          email: 'e@x.io',
          password: 'pw',
          serverUrl: 'http://example.com',
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_SERVER' });
    expect(seen).toHaveLength(0);
    expect(store.getSnapshot()).toBeNull();
  });

  it('rejects a 200 without a refresh token and stores nothing', async () => {
    const { store, hook } = await setup();
    mockFetch(() => ({ status: 200, body: { token: 'a' } }));
    await expect(
      act(() =>
        hook.result.current.signIn({ email: 'e@x.io', password: 'pw', serverUrl: 'https://h' }),
      ),
    ).rejects.toMatchObject({ code: 'NOT_JSON' });
    expect(store.getSnapshot()).toBeNull();
    expect(hook.result.current.status).toBe('signedOut');
  });

  it('registers against the chosen server', async () => {
    const { hook } = await setup();
    const seen = mockFetch(() => ({ status: 200, body: pair }));
    await act(() =>
      hook.result.current.register({ email: ' e@x.io ', password: 'pw', serverUrl: 'https://h' }),
    );
    expect(hook.result.current.status).toBe('signedIn');
    expect(seen[0]?.url).toBe('https://h/api/auth/register');
    expect(JSON.parse(seen[0]?.body ?? '{}')).toEqual({ email: 'e@x.io', password: 'pw' });
  });

  it('signs out via the signed-out server and clears the cache', async () => {
    const { store, hook } = await setup(stored);
    const clear = jest.spyOn(queryClient, 'clear');
    const seen = mockFetch(() => ({ status: 204 }));
    await act(() => hook.result.current.signOut());
    expect(hook.result.current.status).toBe('signedOut');
    expect(store.lastServerUrl()).toBe('https://h');
    expect(clear).toHaveBeenCalled();
    expect(seen[0]?.url).toBe('https://h/api/auth/logout');
    expect(seen[0]?.body).toBe(JSON.stringify({ refreshToken: 'r' }));
  });

  it('signs out immediately while the logout request is still pending', async () => {
    const { hook } = await setup(stored);
    // The hanging request leaves the 15 s client timeout pending.
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
    await act(() => hook.result.current.signOut());
    expect(hook.result.current.status).toBe('signedOut');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://h/api/auth/logout',
      expect.objectContaining({ body: JSON.stringify({ refreshToken: 'r' }) }),
    );
  });

  it('signs out even when logout fails, and clears the cache', async () => {
    const { store, hook } = await setup(stored);
    const clear = jest.spyOn(queryClient, 'clear');
    mockFetch(() => ({ reject: new TypeError('offline') }));
    await act(() => hook.result.current.signOut());
    expect(hook.result.current.status).toBe('signedOut');
    expect(store.lastServerUrl()).toBe('https://h');
    expect(clear).toHaveBeenCalled();
  });
});
