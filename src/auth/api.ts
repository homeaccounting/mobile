import { ApiClient, ApiError } from '@/api/client';
import { authApi } from '@/api/auth';
import { HOSTED_SERVER_URL } from './serverUrl';
import { sessionStore, type SessionStore } from './session';

export function createUnauthenticatedClient(serverUrl: string): ApiClient {
  return new ApiClient({
    getBaseUrl: () => serverUrl,
    getToken: () => null,
    refreshSession: () => Promise.resolve(false),
  });
}

export function createAppClient(store: SessionStore): ApiClient {
  const client: ApiClient = new ApiClient({
    getBaseUrl: () => store.getSnapshot()?.serverUrl ?? HOSTED_SERVER_URL,
    getToken: () => store.getSnapshot()?.accessToken ?? null,
    refreshSession: async () => {
      const current = store.getSnapshot();
      if (!current) return false;
      const sent = current.refreshToken;
      try {
        const res = await authApi(client).refresh({ refreshToken: sent });
        // Compare-and-set: a sign-out or new sign-in during the call wins.
        if (store.getSnapshot()?.refreshToken !== sent) return false;
        await store.set({
          serverUrl: current.serverUrl,
          accessToken: res.token,
          refreshToken: res.refreshToken,
        });
        return true;
      } catch (err) {
        // Only the backend rejecting the token ends the session; offline keeps it.
        if (err instanceof ApiError && err.status === 401) {
          if (store.getSnapshot()?.refreshToken === sent) await store.clear();
          return false;
        }
        throw err;
      }
    },
  });
  return client;
}

export const apiClient = createAppClient(sessionStore);
