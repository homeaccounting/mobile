import { resetSecureStore, secureStoreMock } from '../../test/secureStore';
import { createSessionStore } from './session';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../../test/secureStore')>('../../test/secureStore')
      .secureStoreMock,
);

const full = { 'ha.serverUrl': 'https://h', 'ha.accessToken': 'a', 'ha.refreshToken': 'r' };

describe('sessionStore', () => {
  beforeEach(() => resetSecureStore());

  it('loads a complete session', async () => {
    resetSecureStore(full);
    const s = createSessionStore();
    await s.load();
    expect(s.isLoaded()).toBe(true);
    expect(s.getSnapshot()).toEqual({
      serverUrl: 'https://h',
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('treats an incomplete session as signed out and clears tokens', async () => {
    resetSecureStore({ 'ha.serverUrl': 'https://h', 'ha.accessToken': 'a' });
    const s = createSessionStore();
    await s.load();
    expect(s.getSnapshot()).toBeNull();
    expect(s.lastServerUrl()).toBe('https://h');
    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledWith('ha.accessToken');
  });

  it('survives a throwing keystore', async () => {
    secureStoreMock.getItemAsync.mockRejectedValueOnce(new Error('decrypt'));
    const s = createSessionStore();
    await s.load();
    expect(s.isLoaded()).toBe(true);
    expect(s.getSnapshot()).toBeNull();
  });

  it('updates memory and notifies synchronously on set, then persists', async () => {
    const s = createSessionStore();
    await s.load();
    const seen: unknown[] = [];
    s.subscribe(() => seen.push(s.getSnapshot()));
    const p = s.set({ serverUrl: 'https://h', accessToken: 'a', refreshToken: 'r' });
    expect(s.getSnapshot()?.accessToken).toBe('a');
    expect(seen).toHaveLength(1);
    await p;
    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith('ha.refreshToken', 'r');
  });

  it('clear drops tokens but keeps the last server', async () => {
    resetSecureStore(full);
    const s = createSessionStore();
    await s.load();
    await s.clear();
    expect(s.getSnapshot()).toBeNull();
    expect(s.lastServerUrl()).toBe('https://h');
    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledWith('ha.refreshToken');
  });

  it('keeps a stable snapshot reference between changes', async () => {
    resetSecureStore(full);
    const s = createSessionStore();
    await s.load();
    expect(s.getSnapshot()).toBe(s.getSnapshot());
  });
});
