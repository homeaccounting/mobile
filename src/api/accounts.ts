import type { ApiClient } from './client';
import type { AccountListResponse, AccountResponse } from './types';

export const accountsApi = (client: ApiClient) => ({
  list: async (): Promise<AccountResponse[]> => {
    const res = await client.get<AccountListResponse>('/api/accounts');
    return res.accounts;
  },
});
