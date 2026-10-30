import { ACCOUNT_SUBTYPE_TYPES, type AccountResponse, type AccountSubtypeType } from '@/api/types';
import i18n from '@/i18n';

// Ported from web/src/features/accounts/accountGroups.ts; keep the two in step.

// A LEAF holds `accounts`; a PARENT holds `subgroups` and has no direct accounts.
export interface AccountGroup {
  key: string;
  label: string;
  accounts: AccountResponse[];
  subgroups?: AccountGroup[];
}

export const OTHER_GROUP = { key: 'other' } as const;
export const SHARED_GROUP = { key: 'shared' } as const;

const otherLabel = () => i18n.t('accounts.group.other');

interface SecondaryGrouping {
  field: string;
  // Sub-group only when the section has strictly more accounts than this.
  minCount: number;
  formatValue?: (raw: string) => string;
}

// A kind splits by the field below once it is large enough and yields ≥2 buckets,
// so users with a handful of accounts keep the plain list.
const SECONDARY_GROUPING: Partial<Record<AccountSubtypeType, SecondaryGrouping>> = {
  cash: { field: 'storageLocation', minCount: 5 },
  bankAccount: { field: 'bankName', minCount: 5 },
  eWallet: { field: 'provider', minCount: 5 },
  // A freeform asset type has no label, so the raw value is shown.
  asset: {
    field: 'assetType',
    minCount: 5,
    formatValue: (raw) => i18n.t(`accounts.assetType.${raw}`, { defaultValue: raw }),
  },
  loan: { field: 'lender', minCount: 5 },
};

const FALLBACK_BUCKET = Symbol('fallback');

function subgroupValue(account: AccountResponse, field: string): string | null {
  const raw = account.subtype?.[field];
  return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
}

// Named buckets sorted by label, accounts without a value last; input order is kept inside each.
function buildSubgroups(
  kind: AccountSubtypeType,
  accounts: AccountResponse[],
  config: SecondaryGrouping,
): AccountGroup[] {
  const buckets = new Map<string | typeof FALLBACK_BUCKET, AccountResponse[]>();
  for (const account of accounts) {
    const bucketKey = subgroupValue(account, config.field) ?? FALLBACK_BUCKET;
    const bucket = buckets.get(bucketKey);
    if (bucket) bucket.push(account);
    else buckets.set(bucketKey, [account]);
  }

  const named = [...buckets.entries()]
    .filter((entry): entry is [string, AccountResponse[]] => typeof entry[0] === 'string')
    .map(([value, group]) => ({
      key: `${kind}:${value}`,
      label: config.formatValue?.(value) ?? value,
      accounts: group,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const fallback = buckets.get(FALLBACK_BUCKET);
  if (fallback) named.push({ key: `${kind}:__other__`, label: otherLabel(), accounts: fallback });
  return named;
}

function buildKindGroup(kind: AccountSubtypeType, accounts: AccountResponse[]): AccountGroup {
  const leaf = { key: kind, label: i18n.t(`accounts.subtype.${kind}`), accounts };
  const config = SECONDARY_GROUPING[kind];
  if (!config || accounts.length <= config.minCount) return leaf;
  const subgroups = buildSubgroups(kind, accounts, config);
  // A single bucket would only add a redundant header.
  return subgroups.length >= 2 ? { ...leaf, accounts: [], subgroups } : leaf;
}

// Mirrors backend canManageAccount: only owners hold an account as their own.
const isOwned = (a: AccountResponse) => a.role === 'owner';

/**
 * Owned accounts by subtype in canonical order (unknown subtypes under "Other"),
 * then accounts shared with the user. Empty groups are omitted. Labels resolve
 * at call time so they follow the language.
 */
export function buildAccountGroups(accounts: AccountResponse[]): AccountGroup[] {
  const owned = accounts.filter(isOwned);
  const shared = accounts.filter((a) => !isOwned(a));
  const known = (a: AccountResponse) =>
    (ACCOUNT_SUBTYPE_TYPES as readonly string[]).includes(a.subtype?.type ?? '');

  return [
    ...ACCOUNT_SUBTYPE_TYPES.map((kind) =>
      buildKindGroup(
        kind,
        owned.filter((a) => a.subtype?.type === kind),
      ),
    ),
    { key: OTHER_GROUP.key, label: otherLabel(), accounts: owned.filter((a) => !known(a)) },
    { key: SHARED_GROUP.key, label: i18n.t('accounts.group.sharedWithMe'), accounts: shared },
  ].filter((g) => g.accounts.length > 0 || (g.subgroups?.length ?? 0) > 0);
}
