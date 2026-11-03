import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { useAuth } from '@/auth/AuthProvider';
import { sortAccounts } from './accountLabel';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts({ refetchOnMount = true }: { refetchOnMount?: boolean } = {}) {
  const { client } = useAuth();
  return useQuery({
    queryKey: accountsQueryKey,
    refetchOnMount,
    queryFn: () => accountsApi(client).list(),
    select: (accounts) => sortAccounts(accounts.filter((a) => a.status === 'Opened')),
  });
}
