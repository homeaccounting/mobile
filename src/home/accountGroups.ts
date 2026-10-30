import { ACCOUNT_SUBTYPE_TYPES, type AccountResponse } from '@/api/types';
import i18n from '@/i18n';

// Ported from web/src/features/accounts/accountGroups.ts without its nested
// per-institution sub-groups, which a phone list doesn't need yet.

export interface AccountGroup {
  key: string;
  label: string;
  accounts: AccountResponse[];
}

export const OTHER_GROUP = { key: 'other' } as const;
export const SHARED_GROUP = { key: 'shared' } as const;

// Mirrors backend canManageAccount: only owners hold an account as their own.
const isOwned = (a: AccountResponse) => a.role === 'owner';

/**
 * Owned accounts by subtype in canonical order (unknown subtypes under "Other"),
 * then accounts shared with the user. Empty groups are omitted; input order is
 * kept within a group. Labels resolve at call time so they follow the language.
 */
export function buildAccountGroups(accounts: AccountResponse[]): AccountGroup[] {
  const owned = accounts.filter(isOwned);
  const shared = accounts.filter((a) => !isOwned(a));
  const known = (a: AccountResponse) =>
    (ACCOUNT_SUBTYPE_TYPES as readonly string[]).includes(a.subtype?.type ?? '');

  return [
    ...ACCOUNT_SUBTYPE_TYPES.map((kind) => ({
      key: kind,
      label: i18n.t(`accounts.subtype.${kind}`),
      accounts: owned.filter((a) => a.subtype?.type === kind),
    })),
    {
      key: OTHER_GROUP.key,
      label: i18n.t('accounts.group.other'),
      accounts: owned.filter((a) => !known(a)),
    },
    { key: SHARED_GROUP.key, label: i18n.t('accounts.group.sharedWithMe'), accounts: shared },
  ].filter((g) => g.accounts.length > 0);
}
