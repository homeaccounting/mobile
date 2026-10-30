import { ActivityIndicator, Linking, Pressable, SectionList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { formatMoney } from '@/lib/format';
import { buildAccountGroups } from './accountGroups';
import { accountLabelParts } from './accountLabel';
import { useAccounts } from './useAccounts';

export function AccountList() {
  const { t, i18n } = useTranslation();
  const { serverUrl } = useAuth();
  const accounts = useAccounts();

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

  return (
    <SectionList
      testID="accounts"
      sections={buildAccountGroups(accounts.data).map((g) => ({ ...g, data: g.accounts }))}
      keyExtractor={(a) => a.id}
      refreshing={accounts.isRefetching}
      onRefresh={() => void accounts.refetch()}
      stickySectionHeadersEnabled={false}
      contentContainerClassName="flex-grow px-4"
      renderSectionHeader={({ section }) => (
        <Text className="pb-1 pt-4 text-sm font-semibold uppercase text-gray-500">
          {section.label}
        </Text>
      )}
      renderItem={({ item, section }) => {
        const { qualifier } = accountLabelParts(item, section.accounts);
        return (
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1">
              <Text className="text-base" numberOfLines={1}>
                {item.name}
              </Text>
              {qualifier ? (
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {qualifier}
                </Text>
              ) : null}
            </View>
            <Text className="ml-3 text-base font-semibold">
              {formatMoney(item.balance, item.currency, i18n.language)}
            </Text>
          </View>
        );
      }}
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
