const data = new Map<string, string>();
export const secureStoreMock = {
  getItemAsync: jest.fn((k: string) => Promise.resolve(data.get(k) ?? null)),
  setItemAsync: jest.fn((k: string, v: string) => {
    data.set(k, v);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((k: string) => {
    data.delete(k);
    return Promise.resolve();
  }),
};
export function resetSecureStore(seed: Record<string, string> = {}) {
  data.clear();
  for (const [k, v] of Object.entries(seed)) data.set(k, v);
  jest.clearAllMocks();
}
