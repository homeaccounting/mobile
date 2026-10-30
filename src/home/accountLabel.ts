import type { AccountResponse, AccountSubtypeType } from '@/api/types';

// Ported from web/src/features/accounts/accountLabel.ts; keep the two in step.

export interface AccountLabelParts {
  name: string;
  qualifier: string | null;
}

// The institution-like field that tells the user which account a name refers to.
// Assets are absent: assetType is a category, not an identity.
const QUALIFIER_FIELD: Partial<Record<AccountSubtypeType, string>> = {
  cash: 'storageLocation',
  bankAccount: 'bankName',
  eWallet: 'provider',
  loan: 'lender',
};

// The subtype is `{ type: string; [k]: unknown }`, so the field may be absent, blank or not a string.
function qualifierOf(account: AccountResponse): string | null {
  const field = account.subtype && QUALIFIER_FIELD[account.subtype.type as AccountSubtypeType];
  if (!field) return null;
  const raw = account.subtype?.[field];
  return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
}

function collisionKey(account: AccountResponse): string {
  return `${account.name.trim().toLowerCase()} | ${qualifierOf(account) ?? ''}`;
}

/** The identifying qualifier, plus the currency when name and qualifier collide within `siblings`. */
export function accountLabelParts(
  account: AccountResponse,
  siblings: readonly AccountResponse[],
): AccountLabelParts {
  const qualifier = qualifierOf(account);
  const key = collisionKey(account);
  const collides = siblings.some((s) => s.id !== account.id && collisionKey(s) === key);
  const qualifiers = [qualifier, collides ? account.currency : null].filter(
    (q): q is string => q !== null,
  );
  return { name: account.name, qualifier: qualifiers.length > 0 ? qualifiers.join(' · ') : null };
}

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

// Name, then qualifier, then currency, then id, so the order never wobbles.
export function compareAccounts(a: AccountResponse, b: AccountResponse): number {
  return (
    byText(a.name, b.name) ||
    byText(qualifierOf(a) ?? '', qualifierOf(b) ?? '') ||
    byText(a.currency, b.currency) ||
    byText(a.id, b.id)
  );
}

export function sortAccounts(accounts: readonly AccountResponse[]): AccountResponse[] {
  return [...accounts].sort(compareAccounts);
}
