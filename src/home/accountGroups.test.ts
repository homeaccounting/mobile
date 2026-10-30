import type { AccountResponse, AccountRole } from '@/api/types';
import i18n from '@/i18n';
import { buildAccountGroups, OTHER_GROUP, SHARED_GROUP } from './accountGroups';

// Ported from web/src/features/accounts/accountGroups.test.ts (top-level groups only).
function acc(id: string, role: AccountRole, subtype: string | null): AccountResponse {
  return {
    id,
    name: id,
    balance: 0,
    currency: 'USD',
    overdraftLimit: null,
    subtype: subtype ? { type: subtype } : null,
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
