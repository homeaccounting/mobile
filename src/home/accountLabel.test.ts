import type { AccountResponse } from '@/api/types';
import { compareAccounts, sortAccounts } from './accountLabel';

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

  it('breaks a name tie between assets by their asset type', () => {
    const vehicle = acc('v', 'Family', { kind: 'asset', sub: { assetType: 'vehicle' } });
    const property = acc('p', 'Family', { kind: 'asset', sub: { assetType: 'property' } });
    expect(ids(sortAccounts([vehicle, property]))).toEqual(['p', 'v']);
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
