import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AccountResponse, PromptResponse, TransactionResponse } from '@/api/types';
import { AuthProvider } from '@/auth/AuthProvider';
import { createSessionStore } from '@/auth/session';
import i18n from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import Home from '../app/(app)/index';
import { mockFetch, type RecordedRequest } from './fetch';
import { resetSecureStore, secureStoreMock } from './secureStore';

jest.mock(
  'expo-secure-store',
  () => jest.requireActual<typeof import('./secureStore')>('./secureStore').secureStoreMock,
);

const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o);

function account(over: Partial<AccountResponse> = {}): AccountResponse {
  return {
    id: 'acc-1',
    name: 'Wallet',
    balance: 100,
    currency: 'USD',
    overdraftLimit: null,
    subtype: null,
    status: 'Opened',
    role: 'owner',
    version: 1,
    ...over,
  };
}

function tx(over: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 'tx-1',
    sourceAccountId: 'acc-1',
    targetAccountId: 'ext-1',
    sourceAmount: 4.5,
    sourceCurrency: 'USD',
    targetAmount: 4.5,
    targetCurrency: 'USD',
    description: 'Coffee',
    transactionType: 'expense',
    date: '2026-10-30T10:00:00Z',
    ...over,
  };
}

type Reply = Parameters<typeof mockFetch>[0];

function backend({
  accounts = () => [account()],
  prompt = () => ({ status: 200, body: { kind: 'transactions', succeeded: [], failed: [] } }),
}: {
  accounts?: () => AccountResponse[];
  prompt?: (req: RecordedRequest) => ReturnType<Reply>;
} = {}) {
  return mockFetch((req) => {
    if (req.url.endsWith('/api/accounts')) {
      const list = accounts();
      return { status: 200, body: { accounts: list, totalCount: list.length } };
    }
    if (req.url.endsWith('/api/prompt')) return prompt(req);
    return { status: 200 };
  });
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// The (app) group only mounts once signed in, so the session is loaded before Home renders.
async function renderHome() {
  const store = createSessionStore();
  await store.load();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider store={store}>
          <Home />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return store;
}

const promptField = () => screen.getByLabelText(t('home.promptLabel'));
const accountRequests = (seen: RecordedRequest[]) =>
  seen.filter((r) => r.url.endsWith('/api/accounts'));

async function send(text: string) {
  await fireEvent.changeText(promptField(), text);
  await fireEvent.press(screen.getByRole('button', { name: t('home.send') }));
}

beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false } }));

beforeEach(() => {
  queryClient.clear();
  resetSecureStore({
    'ha.serverUrl': 'https://h.example',
    'ha.accessToken': 'a',
    'ha.refreshToken': 'r',
  });
});

afterEach(() => jest.restoreAllMocks());

describe('account list', () => {
  it('shows active accounts with their balances', async () => {
    backend({
      accounts: () => [
        account({ id: 'a', name: 'Wallet', balance: 12.5 }),
        account({ id: 'b', name: 'Old card', status: 'Closed' }),
      ],
    });
    await renderHome();
    expect(await screen.findByText('Wallet')).toBeTruthy();
    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.queryByText('Old card')).toBeNull();
  });

  it('refetches on pull-to-refresh', async () => {
    const seen = backend();
    await renderHome();
    await screen.findByText('Wallet');
    await fireEvent(screen.getByTestId('accounts'), 'refresh');
    await waitFor(() => expect(accountRequests(seen)).toHaveLength(2));
  });

  it('points to the web app when there are no accounts', async () => {
    backend({ accounts: () => [account({ status: 'Closed' })] });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderHome();
    expect(await screen.findByText(t('home.noAccounts'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: t('home.openWeb') }));
    expect(open).toHaveBeenCalledWith('https://h.example/app/');
  });

  it('offers a retry when accounts fail to load', async () => {
    let fail = true;
    mockFetch(() =>
      fail
        ? { reject: new TypeError('offline') }
        : { status: 200, body: { accounts: [account()], totalCount: 1 } },
    );
    await renderHome();
    expect(await screen.findByText(t('home.accountsError'))).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: t('home.retry') }));
    expect(await screen.findByText('Wallet')).toBeTruthy();
  });
});

describe('prompt bar', () => {
  it('lists recorded and failed entries, clears the field and refreshes balances', async () => {
    let balance = 100;
    const seen = backend({
      accounts: () => [account({ balance })],
      prompt: (req) => {
        expect(JSON.parse(req.body ?? '')).toEqual({ text: 'coffee 4.50, taxi ???' });
        balance = 95.5;
        const body: PromptResponse = {
          kind: 'transactions',
          succeeded: [tx()],
          failed: [{ index: 1, reason: 'Amount is missing' }],
        };
        return { status: 200, body };
      },
    });
    await renderHome();
    expect(await screen.findByText('$100.00')).toBeTruthy();
    await send('coffee 4.50, taxi ???');

    expect(await screen.findByText('Coffee')).toBeTruthy();
    expect(screen.getByText('$4.50 · Wallet')).toBeTruthy();
    expect(screen.getByText(t('home.failedEntry', { reason: 'Amount is missing' }))).toBeTruthy();
    expect(promptField().props.value).toBe('');
    expect(await screen.findByText('$95.50')).toBeTruthy();
    expect(accountRequests(seen)).toHaveLength(2);
  });

  it('dismisses the result card on tap', async () => {
    backend({
      prompt: () => ({
        status: 200,
        body: { kind: 'transactions', succeeded: [tx()], failed: [] },
      }),
    });
    await renderHome();
    await screen.findByText('Wallet');
    await send('coffee 4.50');
    await fireEvent.press(await screen.findByRole('button', { name: t('home.dismiss') }));
    expect(screen.queryByText('Coffee')).toBeNull();
  });

  it('keeps the text on a network error and retries it', async () => {
    let offline = true;
    const seen = backend({
      prompt: () =>
        offline
          ? { reject: new TypeError('offline') }
          : { status: 200, body: { kind: 'transactions', succeeded: [tx()], failed: [] } },
    });
    await renderHome();
    await screen.findByText('Wallet');
    await send('coffee 4.50');

    expect(await screen.findByText(t('errors.unreachable'))).toBeTruthy();
    expect(promptField().props.value).toBe('coffee 4.50');
    offline = false;
    await fireEvent.press(screen.getByRole('button', { name: t('home.retry') }));
    expect(await screen.findByText('Coffee')).toBeTruthy();
    expect(seen.filter((r) => r.url.endsWith('/api/prompt'))).toHaveLength(2);
  });

  it('shows the domain message of a 400', async () => {
    backend({
      prompt: () => ({ status: 400, body: { message: 'No default account', code: 'X' } }),
    });
    await renderHome();
    await screen.findByText('Wallet');
    await send('coffee');
    expect(await screen.findByText('No default account')).toBeTruthy();
  });

  it('replaces the prompt bar with a notice when the LLM is disabled', async () => {
    const seen = backend({ prompt: () => ({ status: 503, text: 'LLM feature disabled' }) });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderHome();
    await screen.findByText('Wallet');
    await send('coffee');

    expect(await screen.findByText(t('home.captureDisabled'))).toBeTruthy();
    expect(screen.queryByLabelText(t('home.promptLabel'))).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: t('home.selfHostDocs') }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('github.com/homeaccounting/docker'));
    expect(seen.filter((r) => r.url.endsWith('/api/prompt'))).toHaveLength(1);
  });
});

describe('settings', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  async function openSettings() {
    await fireEvent.press(screen.getByRole('button', { name: t('home.settings') }));
  }

  it('shows the server and switches the language', async () => {
    backend();
    await renderHome();
    await openSettings();
    expect(screen.getByText('https://h.example')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Українська' }));
    expect(i18n.language).toBe('uk');
    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith('ha.language', 'uk');
  });

  it('signs out', async () => {
    backend();
    const store = await renderHome();
    await openSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('home.signOut') }));
    await waitFor(() => expect(store.getSnapshot()).toBeNull());
  });
});
