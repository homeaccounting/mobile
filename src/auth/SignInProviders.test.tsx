import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/api/client';
import i18n from '@/i18n';
import { mockFetch } from '../../test/fetch';
import { useAuth } from './AuthProvider';
import { isAppleSignInAvailable } from './providers';
import { SignInProviders } from './SignInProviders';

jest.mock('./AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./providers', () => ({ isAppleSignInAvailable: jest.fn() }));
jest.mock('expo-apple-authentication', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>Apple</Text>
      </Pressable>
    ),
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { BLACK: 2 },
  };
});

const t = (k: string) => i18n.t(k);
const signInWithProvider = jest.fn();
jest
  .mocked(useAuth)
  .mockReturnValue({ signInWithProvider } as unknown as ReturnType<typeof useAuth>);

async function renderButtons(
  providers: { status: number; body?: unknown } | { reject: Error },
  apple = true,
  props: Partial<Parameters<typeof SignInProviders>[0]> = {},
) {
  jest.mocked(isAppleSignInAvailable).mockResolvedValue(apple);
  const seen = mockFetch(() => providers);
  const onBusy = jest.fn();
  const onError = jest.fn();
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
    >
      <SignInProviders
        serverInput="https://h"
        disabled={false}
        onBusy={onBusy}
        onError={onError}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { seen, onBusy, onError };
}

afterEach(() => signInWithProvider.mockReset());

describe('SignInProviders', () => {
  it('shows the providers the server enables, with the divider', async () => {
    const { seen } = await renderButtons({
      status: 200,
      body: { password: true, google: true, apple: true },
    });
    expect(await screen.findByRole('button', { name: t('auth.continueWithGoogle') })).toBeTruthy();
    expect(await screen.findByText('Apple')).toBeTruthy();
    expect(screen.getByText(t('auth.or'))).toBeTruthy();
    expect(seen[0]?.url).toBe('https://h/api/auth/providers');
  });

  it('hides Apple when the device cannot use it', async () => {
    await renderButtons(
      { status: 200, body: { password: true, google: true, apple: true } },
      false,
    );
    expect(await screen.findByRole('button', { name: t('auth.continueWithGoogle') })).toBeTruthy();
    expect(screen.queryByText('Apple')).toBeNull();
  });

  it.each([
    ['an older server', { status: 404 }],
    ['an unreachable server', { reject: new TypeError('offline') }],
    [
      'no providers enabled',
      { status: 200, body: { password: true, google: false, apple: false } },
    ],
  ])('renders nothing for %s', async (_, reply) => {
    const { seen } = await renderButtons(reply);
    await waitFor(() => expect(seen).toHaveLength(1));
    // The query settles on a batched timer; let it land inside act.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(t('auth.or'))).toBeNull();
  });

  it('does not ask an invalid server', async () => {
    const { seen } = await renderButtons({ status: 200 }, true, {
      serverInput: 'http://example.com',
    });
    await waitFor(() => expect(isAppleSignInAvailable).toHaveBeenCalled());
    expect(seen).toHaveLength(0);
  });

  it('signs in and reports busy', async () => {
    signInWithProvider.mockResolvedValue('signedIn');
    const { onBusy, onError } = await renderButtons({
      status: 200,
      body: { password: true, google: true, apple: false },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: t('auth.continueWithGoogle') }),
    );
    expect(signInWithProvider).toHaveBeenCalledWith('google', 'https://h');
    expect(onBusy).toHaveBeenCalledWith(true);
    expect(onError).toHaveBeenLastCalledWith([]);
  });

  it('clears busy and shows nothing on cancel', async () => {
    signInWithProvider.mockResolvedValue('cancelled');
    const { onBusy, onError } = await renderButtons({
      status: 200,
      body: { password: true, google: true, apple: false },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: t('auth.continueWithGoogle') }),
    );
    await waitFor(() => expect(onBusy).toHaveBeenLastCalledWith(false));
    expect(onError).toHaveBeenLastCalledWith([]);
  });

  it('shows a rejected sign-in', async () => {
    signInWithProvider.mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'x' }),
    );
    const { onBusy, onError } = await renderButtons({
      status: 200,
      body: { password: true, google: true, apple: false },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: t('auth.continueWithGoogle') }),
    );
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith([t('errors.providerRejected')]));
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it('ignores taps while disabled', async () => {
    await renderButtons(
      { status: 200, body: { password: true, google: true, apple: false } },
      true,
      { disabled: true },
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: t('auth.continueWithGoogle') }),
    );
    expect(signInWithProvider).not.toHaveBeenCalled();
  });
});
