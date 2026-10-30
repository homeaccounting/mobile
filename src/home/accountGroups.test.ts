import type { AccountResponse, AccountRole } from '@/api/types';
import i18n from '@/i18n';
import { buildAccountGroups, OTHER_GROUP, SHARED_GROUP } from './accountGroups';

// Ported from web/src/features/accounts/accountGroups.test.ts.
function acc(
  id: string,
  role: AccountRole,
  subtype: string | null,
  extra?: Record<string, unknown>,
): AccountResponse {
  return {
    id,
    name: id,
    balance: 0,
    currency: 'USD',
    overdraftLimit: null,
    subtype: subtype ? { type: subtype, ...extra } : null,
    status: 'Opened',
    role,
    version: 1,
  };
}

describe('buildAccountGroups', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('groups owned accounts by subtype in canonical order, omitting empty groups', () => {
    const groups = buildAccountGroups([
      acc('b', 'owner', 'bankAccount'),
      acc('c', 'owner', 'cash'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['cash', 'bankAccount']);
    expect(groups.map((g) => g.label)).toEqual(['Cash', 'Bank account']);
  });

  it('collects owned accounts with unknown/absent subtype into the Other group', () => {
    const groups = buildAccountGroups([
      acc('n', 'owner', null),
      acc('u', 'owner', 'somethingUnknown'),
    ]);
    const other = groups.find((g) => g.key === OTHER_GROUP.key);
    expect(other?.accounts.map((a) => a.id)).toEqual(['n', 'u']);
  });

  it('adds a trailing Shared-with-me group for shared accounts, excluding owned', () => {
    const groups = buildAccountGroups([
      acc('mine', 'owner', 'cash'),
      acc('ed', 'editor', 'bankAccount'),
      acc('vw', 'viewer', 'cash'),
    ]);
    expect(groups.at(-1)?.key).toBe(SHARED_GROUP.key);
    expect(groups.at(-1)?.label).toBe('Shared with me');
    expect(groups.at(-1)?.accounts.map((a) => a.id)).toEqual(['ed', 'vw']);
  });

  it('omits the Shared-with-me group when there are no shared accounts', () => {
    const groups = buildAccountGroups([acc('mine', 'owner', 'cash')]);
    expect(groups.some((g) => g.key === SHARED_GROUP.key)).toBe(false);
  });

  it('resolves labels in the current language', async () => {
    await i18n.changeLanguage('uk');
    const groups = buildAccountGroups([acc('c', 'owner', 'cash'), acc('ed', 'editor', 'cash')]);
    expect(groups.map((g) => g.label)).toEqual(['Готівка', 'Надано мені']);
  });
});

const bank = (id: string, bankName?: string) =>
  acc(id, 'owner', 'bankAccount', bankName ? { bankName } : undefined);
const groupFor = (groups: ReturnType<typeof buildAccountGroups>, key: string) =>
  groups.find((g) => g.key === key);

describe('buildAccountGroups — secondary grouping', () => {
  it('keeps a section flat at or below the threshold (5)', () => {
    const g = groupFor(
      buildAccountGroups([
        bank('a', 'A'),
        bank('b', 'B'),
        bank('c', 'A'),
        bank('d', 'B'),
        bank('e', 'A'),
      ]),
      'bankAccount',
    );
    expect(g?.subgroups).toBeUndefined();
    expect(g?.accounts).toHaveLength(5);
  });

  it('sub-groups by bank name above the threshold, sorted, keeping input order', () => {
    const g = groupFor(
      buildAccountGroups([
        bank('z1', 'Zebra'),
        bank('a1', 'Alpha'),
        bank('z2', 'Zebra'),
        bank('a2', 'Alpha'),
        bank('a3', 'Alpha'),
        bank('z3', 'Zebra'),
      ]),
      'bankAccount',
    );
    expect(g?.accounts).toEqual([]);
    expect(g?.subgroups?.map((s) => s.key)).toEqual(['bankAccount:Alpha', 'bankAccount:Zebra']);
    expect(g?.subgroups?.[0]?.accounts.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('collects accounts with no usable value into a trailing Other sub-group', () => {
    const g = groupFor(
      buildAccountGroups([
        bank('a1', 'Alpha'),
        bank('n1'),
        bank('a2', 'Alpha'),
        bank('a3', 'Alpha'),
        acc('blank', 'owner', 'bankAccount', { bankName: '  ' }),
        acc('num', 'owner', 'bankAccount', { bankName: 123 }),
      ]),
      'bankAccount',
    );
    expect(g?.subgroups?.map((s) => s.label)).toEqual(['Alpha', 'Other']);
    expect(g?.subgroups?.at(-1)?.accounts.map((a) => a.id)).toEqual(['n1', 'blank', 'num']);
  });

  it('stays flat when only one bucket exists', () => {
    const g = groupFor(
      buildAccountGroups(Array.from({ length: 6 }, (_, i) => bank(`a${i}`, 'Alpha'))),
      'bankAccount',
    );
    expect(g?.subgroups).toBeUndefined();
  });

  it('never sub-groups Other or Shared with me', () => {
    const groups = buildAccountGroups([
      ...Array.from({ length: 6 }, (_, i) =>
        acc(`u${i}`, 'owner', 'mystery', { bankName: `B${i}` }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        acc(`s${i}`, 'editor', 'bankAccount', { bankName: `B${i}` }),
      ),
    ]);
    expect(groupFor(groups, OTHER_GROUP.key)?.subgroups).toBeUndefined();
    expect(groupFor(groups, SHARED_GROUP.key)?.subgroups).toBeUndefined();
  });

  it('sub-groups e-wallets by provider, loans by lender and cash by storage location', () => {
    const many = (kind: string, field: string, values: string[]) =>
      groupFor(
        buildAccountGroups(values.map((v, i) => acc(`${kind}${i}`, 'owner', kind, { [field]: v }))),
        kind,
      )?.subgroups?.map((s) => s.label);
    expect(many('eWallet', 'provider', ['R', 'P', 'R', 'P', 'P', 'R'])).toEqual(['P', 'R']);
    expect(many('loan', 'lender', ['B', 'A', 'B', 'A', 'B', 'A'])).toEqual(['A', 'B']);
    expect(many('cash', 'storageLocation', ['W', 'S', 'W', 'S', 'W', 'S'])).toEqual(['S', 'W']);
  });

  it('labels asset sub-groups by asset type, falling back to a freeform value', () => {
    const g = groupFor(
      buildAccountGroups(
        ['property', 'stocks', 'piano', 'property', 'stocks', 'piano'].map((t, i) =>
          acc(`a${i}`, 'owner', 'asset', { assetType: t }),
        ),
      ),
      'asset',
    );
    expect(g?.subgroups?.map((s) => s.label)).toEqual(['piano', 'Property', 'Stocks']);
    expect(g?.subgroups?.map((s) => s.key)).toEqual([
      'asset:piano',
      'asset:property',
      'asset:stocks',
    ]);
  });
});
