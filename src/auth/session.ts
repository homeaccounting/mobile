import * as SecureStore from 'expo-secure-store';

export interface Session {
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
}

const K = { server: 'ha.serverUrl', access: 'ha.accessToken', refresh: 'ha.refreshToken' } as const;

type Storage = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

export function createSessionStore(storage: Storage = SecureStore) {
  let session: Session | null = null;
  let lastServer: string | null = null;
  let loaded = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const dropTokens = () =>
    Promise.all([storage.deleteItemAsync(K.access), storage.deleteItemAsync(K.refresh)]).then(
      () => undefined,
    );

  return {
    async load() {
      try {
        const [serverUrl, accessToken, refreshToken] = await Promise.all([
          storage.getItemAsync(K.server),
          storage.getItemAsync(K.access),
          storage.getItemAsync(K.refresh),
        ]);
        lastServer = serverUrl;
        session =
          serverUrl && accessToken && refreshToken
            ? { serverUrl, accessToken, refreshToken }
            : null;
        if (!session) await dropTokens();
      } catch {
        // Keystore entries can become undecryptable (e.g. after a backup restore).
        session = null;
        await dropTokens().catch(() => undefined);
      }
      loaded = true;
      emit();
    },
    getSnapshot: () => session,
    isLoaded: () => loaded,
    lastServerUrl: () => lastServer,
    // Memory first and synchronous, so a concurrent reader never sees a stale token.
    async set(next: Session) {
      session = next;
      lastServer = next.serverUrl;
      emit();
      await Promise.all([
        storage.setItemAsync(K.server, next.serverUrl),
        storage.setItemAsync(K.access, next.accessToken),
        storage.setItemAsync(K.refresh, next.refreshToken),
      ]);
    },
    async clear() {
      session = null;
      emit();
      await dropTokens();
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
export const sessionStore = createSessionStore();
