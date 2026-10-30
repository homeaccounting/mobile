import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, SectionList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AccountResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { formatMoney } from '@/lib/format';
import { buildAccountGroups, type AccountGroup } from './accountGroups';
import { accountLabelParts } from './accountLabel';
import { useAccounts } from './useAccounts';

// `siblings` is null inside a sub-group, whose header already names the institution.
type Row =
  | { type: 'account'; account: AccountResponse; siblings: AccountResponse[] | null }
  | { type: 'subgroup'; group: AccountGroup };

function GroupHeader({
  label,
  collapsed,
  nested,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  nested?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onToggle}
      className={`flex-row items-center ${nested ? 'pb-1 pl-4 pt-3' : 'pb-1 pt-4'}`}
    >
      <Text className="w-4 text-sm text-gray-500">{collapsed ? '▸' : '▾'}</Text>
      <Text
        className={
          nested ? 'text-sm text-gray-600' : 'text-sm font-semibold uppercase text-gray-500'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AccountRow({
  account,
  siblings,
}: {
  account: AccountResponse;
  siblings: AccountResponse[] | null;
}) {
  const { i18n } = useTranslation();
  const qualifier = siblings ? accountLabelParts(account, siblings).qualifier : null;
  return (
    <View
      className={`flex-row items-center justify-between border-b border-gray-100 py-3 ${siblings ? '' : 'pl-4'}`}
    >
      <View className="flex-1">
        <Text className="text-base" numberOfLines={1}>
          {account.name}
        </Text>
        {qualifier ? (
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {qualifier}
          </Text>
        ) : null}
      </View>
      <Text className="ml-3 text-base font-semibold">
        {formatMoney(account.balance, account.currency, i18n.language)}
      </Text>
    </View>
  );
}

export function AccountList() {
  const { t } = useTranslation();
  const { serverUrl } = useAuth();
  const accounts = useAccounts();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  if (accounts.isPending) return <ActivityIndicator className="flex-1" />;
  if (accounts.isError)
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-base text-gray-700">{t('home.accountsError')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void accounts.refetch()}
          className="mt-3 rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="text-base">{t('home.retry')}</Text>
        </Pressable>
      </View>
    );

  const rows = (group: AccountGroup): Row[] =>
    group.subgroups
      ? group.subgroups.flatMap((sub): Row[] => [
          { type: 'subgroup', group: sub },
          ...(collapsed.has(sub.key)
            ? []
            : sub.accounts.map((account): Row => ({ type: 'account', account, siblings: null }))),
        ])
      : group.accounts.map((account) => ({ type: 'account', account, siblings: group.accounts }));

  return (
    <SectionList
      testID="accounts"
      sections={buildAccountGroups(accounts.data).map((group) => ({
        ...group,
        data: collapsed.has(group.key) ? [] : rows(group),
      }))}
      keyExtractor={(row) => (row.type === 'account' ? row.account.id : row.group.key)}
      refreshing={accounts.isRefetching}
      onRefresh={() => void accounts.refetch()}
      stickySectionHeadersEnabled={false}
      contentContainerClassName="flex-grow px-4"
      renderSectionHeader={({ section }) => (
        <GroupHeader
          label={section.label}
          collapsed={collapsed.has(section.key)}
          onToggle={() => toggle(section.key)}
        />
      )}
      renderItem={({ item }) =>
        item.type === 'subgroup' ? (
          <GroupHeader
            label={item.group.label}
            collapsed={collapsed.has(item.group.key)}
            nested
            onToggle={() => toggle(item.group.key)}
          />
        ) : (
          <AccountRow account={item.account} siblings={item.siblings} />
        )
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center text-base text-gray-700">{t('home.noAccounts')}</Text>
          {/* Account creation isn't in the mobile MVP; web is served from the same origin. */}
          {serverUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(`${serverUrl}/app/`)}
              className="mt-3"
            >
              <Text className="text-base text-blue-600">{t('home.openWeb')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
    />
  );
}
