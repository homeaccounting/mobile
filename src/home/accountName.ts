import { ACCOUNT_SUBTYPE_TYPES, type AccountResponse, type AccountSubtypeType } from '@/api/types';
import i18n from '@/i18n';

// The universal account naming scheme, shared with web and the backend:
// backend/docs/decisions/009-account-naming.md. Change that ADR first.
// Ported from web/src/features/accounts/accountName.ts.
//
// Full name: `{Kind} › {Qualifier} › {Name} · {Currency}`. Short forms drop the
// segments the surrounding context already shows.

export interface AccountNameParts {
  kind: string;
  qualifier: string | null;
  name: string;
  currency: string;
}

// Segments the context already displays: a sub-header shows the qualifier, a
// formatted balance shows the currency.
export interface ShownByContext {
  qualifier?: boolean;
  currency?: boolean;
}

const PATH_SEPARATOR = ' › ';
const SUFFIX_SEPARATOR = ' · ';

// The field that tells the user WHICH account a name refers to. For assets it is
// the category, shown through its localized label (a freeform type shows as is).
const QUALIFIER: Record<AccountSubtypeType, { field: string; format?: (raw: string) => string }> = {
  cash: { field: 'storageLocation' },
  bankAccount: { field: 'bankName' },
  eWallet: { field: 'provider' },
  asset: {
    field: 'assetType',
    format: (raw) => i18n.t(`accounts.assetType.${raw}`, { defaultValue: raw }),
  },
  loan: { field: 'lender' },
};

function knownKind(account: AccountResponse): AccountSubtypeType | null {
  const type = account.subtype?.type;
  return type && (ACCOUNT_SUBTYPE_TYPES as readonly string[]).includes(type)
    ? (type as AccountSubtypeType)
    : null;
}

// The subtype is `{ type: string; [k]: unknown }`, so the field may be absent,
// blank or not a string; all of those mean "no qualifier".
export function rawQualifier(account: AccountResponse): string | null {
  const kind = knownKind(account);
  if (!kind) return null;
  const raw = account.subtype?.[QUALIFIER[kind].field];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed !== '' ? trimmed : null;
}

export function accountNameParts(account: AccountResponse): AccountNameParts {
  const kind = knownKind(account);
  const raw = rawQualifier(account);
  const format = kind ? QUALIFIER[kind].format : undefined;
  return {
    kind: kind ? i18n.t(`accounts.subtype.${kind}`) : i18n.t('accounts.group.other'),
    qualifier: raw !== null && format ? format(raw) : raw,
    name: account.name,
    currency: account.currency,
  };
}

export function fullAccountName(account: AccountResponse): string {
  const { kind, qualifier, name, currency } = accountNameParts(account);
  const path = [kind, qualifier, name].filter((s): s is string => s !== null);
  return path.join(PATH_SEPARATOR) + SUFFIX_SEPARATOR + currency;
}

export function shortAccountName(account: AccountResponse, shown: ShownByContext = {}): string {
  const { qualifier, name, currency } = accountNameParts(account);
  const parts = [name];
  if (qualifier !== null && !shown.qualifier) parts.push(qualifier);
  if (!shown.currency) parts.push(currency);
  return parts.join(SUFFIX_SEPARATOR);
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Every whitespace-separated token must appear in the full name, so
// "privat usd" finds the PrivatBank USD card.
export function accountMatches(account: AccountResponse, query: string): boolean {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fold(fullAccountName(account));
  return tokens.every((t) => haystack.includes(t));
}
