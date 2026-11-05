import type { AccountResponse } from '@/api/types';
import { rawQualifier } from './accountName';

// Ordering half of web/src/features/accounts/accountLabel.ts; labels follow
// ADR 009 (backend/docs/decisions/009-account-naming.md) in ./accountName.

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

// Name, then the raw qualifier (asset type included; empty first), then
// currency, then id, so the order never wobbles.
export function compareAccounts(a: AccountResponse, b: AccountResponse): number {
  return (
    byText(a.name, b.name) ||
    byText(rawQualifier(a) ?? '', rawQualifier(b) ?? '') ||
    byText(a.currency, b.currency) ||
    byText(a.id, b.id)
  );
}

export function sortAccounts(accounts: readonly AccountResponse[]): AccountResponse[] {
  return [...accounts].sort(compareAccounts);
}
