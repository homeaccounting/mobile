import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from '@/auth/AuthProvider';
import { createSessionStore } from '@/auth/session';
import i18n from '@/i18n';
import SignIn from '../app/sign-in';
import { mockFetch } from './fetch';
import { resetSecureStore } from './secureStore';

jest.mock('@/auth/SignInProviders', () => ({ SignInProviders: () => null }));
jest.mock(
  'expo-secure-store',
  () => jest.requireActual<typeof import('./secureStore')>('./secureStore').secureStoreMock,
);
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactElement }) => children,
}));

const t = (k: string) => i18n.t(k);

async function setup() {
  resetSecureStore();
  const store = createSessionStore();
  await render(
    <AuthProvider store={store}>
      <SignIn />
    </AuthProvider>,
  );
  await screen.findByLabelText(t('auth.email'));
  return store;
}

async function submit(email = 'a@b.io', password = 'secret') {
  await fireEvent.changeText(screen.getByLabelText(t('auth.email')), email);
  await fireEvent.changeText(screen.getByLabelText(t('auth.password')), password);
  await fireEvent.press(screen.getByRole('button', { name: t('auth.signIn') }));
}

describe('SignIn', () => {
  it('shows the remembered server that loads after mount', async () => {
    resetSecureStore({ 'ha.serverUrl': 'http://192.168.1.10:8080' });
    await render(
      <AuthProvider store={createSessionStore()}>
        <SignIn />
      </AuthProvider>,
    );
    expect(await screen.findByText(/192\.168\.1\.10:8080/)).toBeTruthy();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows invalid credentials', async () => {
    await setup();
    mockFetch(() => ({ status: 404, body: { code: 'NOT_FOUND' } }));
    await submit();
    expect(await screen.findByText(t('errors.invalidCredentials'))).toBeTruthy();
  });

  it('shows unreachable', async () => {
    await setup();
    mockFetch(() => ({ reject: new TypeError('offline') }));
    await submit();
    expect(await screen.findByText(t('errors.unreachable'))).toBeTruthy();
    expect(screen.queryByText(t('auth.localNetworkHint'))).toBeNull();
  });

  it('rejects an insecure server without a request', async () => {
    await setup();
    const seen = mockFetch(() => ({ status: 200 }));
    await fireEvent.press(screen.getByRole('button', { name: t('auth.change') }));
    await fireEvent.changeText(screen.getByLabelText(t('auth.server')), 'http://example.com');
    await submit();
    expect(await screen.findByText(t('errors.insecureServer'))).toBeTruthy();
    expect(seen).toHaveLength(0);
  });

  it('adds the local network hint for an unreachable private server', async () => {
    await setup();
    mockFetch(() => ({ reject: new TypeError('offline') }));
    await fireEvent.press(screen.getByRole('button', { name: t('auth.change') }));
    await fireEvent.changeText(screen.getByLabelText(t('auth.server')), 'http://192.168.1.5:8080');
    await submit();
    expect(await screen.findByText(t('auth.localNetworkHint'))).toBeTruthy();
  });

  it('omits the local network hint off iOS', async () => {
    await setup();
    mockFetch(() => ({ reject: new TypeError('offline') }));
    jest.replaceProperty(Platform, 'OS', 'android');
    await fireEvent.press(screen.getByRole('button', { name: t('auth.change') }));
    await fireEvent.changeText(screen.getByLabelText(t('auth.server')), 'http://192.168.1.5:8080');
    await submit();
    expect(await screen.findByText(t('errors.unreachable'))).toBeTruthy();
    expect(screen.queryByText(t('auth.localNetworkHint'))).toBeNull();
  });

  it('ignores a second tap while a sign-in is in flight', async () => {
    await setup();
    // The hanging request leaves the 15 s client timeout pending.
    jest.useFakeTimers();
    const fetchMock = jest.fn(() => new Promise<Response>(() => undefined));
    globalThis.fetch = fetchMock as typeof fetch;
    await fireEvent.changeText(screen.getByLabelText(t('auth.email')), 'a@b.io');
    await fireEvent.changeText(screen.getByLabelText(t('auth.password')), 'secret');
    const button = screen.getByRole('button', { name: t('auth.signIn') });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it('signs in', async () => {
    const store = await setup();
    mockFetch(() => ({
      status: 200,
      body: { token: 'a', refreshToken: 'r', userId: 'u', email: 'a@b.io', expiresIn: 3600 },
    }));
    await submit();
    await waitFor(() => expect(store.getSnapshot()).not.toBeNull());
    expect(store.getSnapshot()?.accessToken).toBe('a');
  });
});
