import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { useAuth } from '@/auth/AuthProvider';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts({ refetchOnMount = true }: { refetchOnMount?: boolean } = {}) {
  const { client } = useAuth();
  return useQuery({
    queryKey: accountsQueryKey,
    refetchOnMount,
    queryFn: () => accountsApi(client).list(),
    select: (accounts) => accounts.filter((a) => a.status === 'Opened'),
  });
}
