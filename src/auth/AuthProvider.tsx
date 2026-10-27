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
import { createUnauthenticatedClient } from './api';
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
      const api = authApi(createUnauthenticatedClient(i.serverUrl));
      const res = await (op === 'login' ? api.login : api.register)({
        email: i.email.trim(),
        password: i.password,
      });
      await store.set({
        serverUrl: i.serverUrl,
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
        if (current)
          await authApi(createUnauthenticatedClient(current.serverUrl))
            .logout({ refreshToken: current.refreshToken })
            .catch(() => undefined);
        await store.clear();
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
