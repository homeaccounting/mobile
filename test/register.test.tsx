import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { createSessionStore } from '@/auth/session';
import i18n from '@/i18n';
import Register from '../app/register';
import { mockFetch } from './fetch';
import { resetSecureStore } from './secureStore';

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
  await render(
    <AuthProvider store={createSessionStore()}>
      <Register />
    </AuthProvider>,
  );
  await screen.findByLabelText(t('auth.email'));
}

async function submit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(t('auth.email')), email);
  await fireEvent.changeText(screen.getByLabelText(t('auth.password')), password);
  await fireEvent.press(screen.getByRole('button', { name: t('auth.register') }));
}

describe('Register', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rejects a short password without a request', async () => {
    await setup();
    const seen = mockFetch(() => ({ status: 200 }));
    await submit('a@b.io', 'short');
    expect(await screen.findByText(t('errors.passwordMin'))).toBeTruthy();
    expect(seen).toHaveLength(0);
  });

  it('rejects a bad email without a request', async () => {
    await setup();
    const seen = mockFetch(() => ({ status: 200 }));
    await submit('nope', 'longenough');
    expect(await screen.findByText(t('errors.invalidEmail'))).toBeTruthy();
    expect(seen).toHaveLength(0);
  });

  it('shows email taken', async () => {
    await setup();
    mockFetch(() => ({
      status: 400,
      body: { code: 'ACCOUNT_ERROR', message: 'Email already registered' },
    }));
    await submit('a@b.io', 'longenough');
    expect(await screen.findByText(t('errors.emailTaken'))).toBeTruthy();
  });

  it('ignores a second tap while a registration is in flight', async () => {
    await setup();
    // The hanging request leaves the 15 s client timeout pending.
    jest.useFakeTimers();
    const fetchMock = jest.fn(() => new Promise<Response>(() => undefined));
    globalThis.fetch = fetchMock as typeof fetch;
    await fireEvent.changeText(screen.getByLabelText(t('auth.email')), 'a@b.io');
    await fireEvent.changeText(screen.getByLabelText(t('auth.password')), 'longenough');
    const button = screen.getByRole('button', { name: t('auth.register') });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});
