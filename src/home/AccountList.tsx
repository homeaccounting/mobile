import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { formatMoney } from '@/lib/format';
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
    <FlatList
      testID="accounts"
      data={accounts.data}
      keyExtractor={(a) => a.id}
      refreshing={accounts.isRefetching}
      onRefresh={() => void accounts.refetch()}
      contentContainerClassName="flex-grow px-4"
      renderItem={({ item }) => (
        <View className="flex-row items-center justify-between border-b border-gray-100 py-4">
          <Text className="flex-1 text-base" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="ml-3 text-base font-semibold">
            {formatMoney(item.balance, item.currency, i18n.language)}
          </Text>
        </View>
      )}
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
