import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';
import { ApiError } from '@/api/client';
import type { IdTokenProvider } from '@/api/types';
import { assertTokenPair, createUnauthenticatedClient } from './api';
import { bindNonce, newRawNonce } from './nonce';
import { nativeSignIn } from './providers';
import { parseServerUrl } from './serverUrl';
import { sessionStore, type SessionStore } from './session';

export type AuthInput = { email: string; password: string; serverUrl: string };
type Status = 'loading' | 'signedOut' | 'signedIn';
interface AuthContextValue {
  status: Status;
  lastServerUrl: string | null;
  signIn(i: AuthInput): Promise<void>;
  register(i: AuthInput): Promise<void>;
  signInWithProvider(
    provider: IdTokenProvider,
    serverUrl: string,
  ): Promise<'signedIn' | 'cancelled'>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  store = sessionStore,
}: {
  children: ReactNode;
  store?: SessionStore;
}) {
  const subscribe = useCallback((l: () => void) => store.subscribe(l), [store]);
  const session = useSyncExternalStore(subscribe, () => store.getSnapshot());
  // The session snapshot stays null across a load that finds nothing, so loaded needs its own subscription.
  const loaded = useSyncExternalStore(subscribe, () => store.isLoaded());
  const status: Status = !loaded ? 'loading' : session ? 'signedIn' : 'signedOut';

  useEffect(() => {
    void store.load();
  }, [store]);

  // One cache rule: cached data belongs to one session on one server.
  useEffect(() => {
    let prev = store.getSnapshot();
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot();
      if (!next || next.serverUrl !== prev?.serverUrl) queryClient.clear();
      prev = next;
    });
    return () => {
      unsubscribe();
    };
  }, [store]);

  const value = useMemo<AuthContextValue>(() => {
    const requireServer = (input: string) => {
      const server = parseServerUrl(input);
      if (!server.ok)
        throw new ApiError({ status: 0, code: 'INVALID_SERVER', message: 'Invalid server URL' });
      return server.url;
    };
    const save = (serverUrl: string, res: Parameters<typeof assertTokenPair>[0]) => {
      const pair = assertTokenPair(res);
      return store.set({ serverUrl, accessToken: pair.token, refreshToken: pair.refreshToken });
    };
    const start = async (op: 'login' | 'register', i: AuthInput) => {
      const serverUrl = requireServer(i.serverUrl);
      const api = authApi(createUnauthenticatedClient(serverUrl));
      await save(
        serverUrl,
        await (op === 'login' ? api.login : api.register)({
          email: i.email.trim(),
          password: i.password,
        }),
      );
    };
    return {
      status,
      lastServerUrl: store.lastServerUrl(),
      signIn: (i) => start('login', i),
      register: (i) => start('register', i),
      async signInWithProvider(provider, input) {
        const serverUrl = requireServer(input);
        const rawNonce = newRawNonce();
        const result = await nativeSignIn(provider, bindNonce(serverUrl, rawNonce));
        if (result.type === 'cancelled') return 'cancelled';
        await save(
          serverUrl,
          await authApi(createUnauthenticatedClient(serverUrl)).idTokenSignIn(provider, {
            idToken: result.idToken,
            rawNonce,
          }),
        );
        return 'signedIn';
      },
      async signOut() {
        const current = store.getSnapshot();
        await store.clear();
        // Signing out must not wait on, or fail with, the network.
        if (current)
          void authApi(createUnauthenticatedClient(current.serverUrl))
            .logout({ refreshToken: current.refreshToken })
            .catch(() => undefined);
      },
    };
  }, [status, store]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
