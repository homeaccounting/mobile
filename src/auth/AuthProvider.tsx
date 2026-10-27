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
import { assertTokenPair, createUnauthenticatedClient } from './api';
import { parseServerUrl } from './serverUrl';
import { sessionStore, type SessionStore } from './session';

export type AuthInput = { email: string; password: string; serverUrl: string };
type Status = 'loading' | 'signedOut' | 'signedIn';
interface AuthContextValue {
  status: Status;
  lastServerUrl: string | null;
  signIn(i: AuthInput): Promise<void>;
  register(i: AuthInput): Promise<void>;
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
    const start = async (op: 'login' | 'register', i: AuthInput) => {
      const server = parseServerUrl(i.serverUrl);
      if (!server.ok)
        throw new ApiError({ status: 0, code: 'INVALID_SERVER', message: 'Invalid server URL' });
      const api = authApi(createUnauthenticatedClient(server.url));
      const res = assertTokenPair(
        await (op === 'login' ? api.login : api.register)({
          email: i.email.trim(),
          password: i.password,
        }),
      );
      await store.set({
        serverUrl: server.url,
        accessToken: res.token,
        refreshToken: res.refreshToken,
      });
    };
    return {
      status,
      lastServerUrl: store.lastServerUrl(),
      signIn: (i) => start('login', i),
      register: (i) => start('register', i),
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
