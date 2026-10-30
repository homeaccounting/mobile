import type { AccountResponse } from '@/api/types';
import { accountLabelParts, compareAccounts, sortAccounts } from './accountLabel';

// Ported from web/src/features/accounts/accountLabel.test.ts.
function acc(
  id: string,
  name: string,
  opts: {
    bankName?: unknown;
    currency?: string;
    kind?: string;
    sub?: Record<string, unknown>;
  } = {},
): AccountResponse {
  const kind = opts.kind ?? 'bankAccount';
  return {
    id,
    name,
    balance: 0,
    currency: opts.currency ?? 'UAH',
    overdraftLimit: null,
    subtype: {
      type: kind,
      ...opts.sub,
      ...('bankName' in opts ? { bankName: opts.bankName } : {}),
    },
    status: 'Opened',
    role: 'owner',
    version: 1,
  };
}

describe('accountLabelParts', () => {
  it('always shows the bank name as the qualifier for a bank account', () => {
    const a = acc('1', 'card', { bankName: 'Monobank' });
    expect(accountLabelParts(a, [a])).toEqual({ name: 'card', qualifier: 'Monobank' });
  });

  it('leaves a non-bank account unqualified when its name is unique', () => {
    const a = acc('1', 'wallet', { kind: 'cash' });
    expect(accountLabelParts(a, [a])).toEqual({ name: 'wallet', qualifier: null });
  });

  it('adds the currency as a tiebreaker when name and bank both collide', () => {
    const a = acc('1', 'visa', { bankName: 'Monobank', currency: 'UAH' });
    const b = acc('2', 'visa', { bankName: 'Monobank', currency: 'USD' });
    expect(accountLabelParts(a, [a, b]).qualifier).toBe('Monobank · UAH');
    expect(accountLabelParts(b, [a, b]).qualifier).toBe('Monobank · USD');
  });

  it('uses currency alone to disambiguate colliding accounts that have no bank name', () => {
    const a = acc('1', 'wallet', { kind: 'cash', currency: 'UAH' });
    const b = acc('2', 'wallet', { kind: 'cash', currency: 'USD' });
    expect(accountLabelParts(a, [a, b]).qualifier).toBe('UAH');
    expect(accountLabelParts(b, [a, b]).qualifier).toBe('USD');
  });

  it('treats a blank or non-string bankName as no bank name', () => {
    const blank = acc('1', 'brokerage', { bankName: '   ' });
    const numeric = acc('2', 'other', { bankName: 123 });
    expect(accountLabelParts(blank, [blank]).qualifier).toBeNull();
    expect(accountLabelParts(numeric, [numeric]).qualifier).toBeNull();
  });

  it('detects name collisions case-insensitively and trimmed', () => {
    const a = acc('1', 'Visa', { bankName: 'Monobank', currency: 'UAH' });
    const b = acc('2', ' visa ', { bankName: 'Monobank', currency: 'USD' });
    expect(accountLabelParts(a, [a, b]).qualifier).toBe('Monobank · UAH');
  });

  it('shows the provider, lender and storage location for the other kinds', () => {
    const wallet = acc('1', 'main', { kind: 'eWallet', sub: { provider: 'PayPal' } });
    const loan = acc('2', 'mortgage', { kind: 'loan', sub: { lender: 'PrivatBank' } });
    const cash = acc('3', 'UAH cash', { kind: 'cash', sub: { storageLocation: 'Wallet' } });
    expect(accountLabelParts(wallet, [wallet]).qualifier).toBe('PayPal');
    expect(accountLabelParts(loan, [loan]).qualifier).toBe('PrivatBank');
    expect(accountLabelParts(cash, [cash]).qualifier).toBe('Wallet');
  });

  it('does not qualify an asset by its type', () => {
    const a = acc('1', 'Downtown flat', { kind: 'asset', sub: { assetType: 'property' } });
    expect(accountLabelParts(a, [a]).qualifier).toBeNull();
  });
});

describe('sortAccounts / compareAccounts', () => {
  const ids = (list: readonly AccountResponse[]) => list.map((a) => a.id);

  it('orders primarily by name, case-insensitively', () => {
    const b = acc('b', 'Zebra', { kind: 'cash' });
    const a = acc('a', 'apple', { kind: 'cash' });
    const c = acc('c', 'Mango', { kind: 'cash' });
    expect(ids(sortAccounts([b, a, c]))).toEqual(['a', 'c', 'b']);
  });

  it('breaks a name tie by the qualifier, then currency, then id', () => {
    const p = acc('p', 'Card', { bankName: 'PrivatBank' });
    const mUsd = acc('m-usd', 'Card', { bankName: 'Monobank', currency: 'USD' });
    const mUah2 = acc('m-uah2', 'Card', { bankName: 'Monobank', currency: 'UAH' });
    const mUah1 = acc('m-uah1', 'Card', { bankName: 'Monobank', currency: 'UAH' });
    expect(ids(sortAccounts([p, mUsd, mUah2, mUah1]))).toEqual(['m-uah1', 'm-uah2', 'm-usd', 'p']);
  });

  it('does not mutate the input array', () => {
    const input = [acc('b', 'Zebra', { kind: 'cash' }), acc('a', 'apple', { kind: 'cash' })];
    sortAccounts(input);
    expect(ids(input)).toEqual(['b', 'a']);
  });

  it('compareAccounts returns 0 for equal ordering keys', () => {
    const a = acc('x', 'Card', { bankName: 'Monobank' });
    expect(compareAccounts(a, a)).toBe(0);
  });
});
