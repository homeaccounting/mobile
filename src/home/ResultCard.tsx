import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AccountResponse, PromptResponse, TransactionResponse } from '@/api/types';
import { formatMoney } from '@/lib/format';
import { useAccounts } from './useAccounts';

interface Props {
  result: PromptResponse;
  onDismiss: () => void;
}

// The user's side of the transaction: the source for expenses and transfers, the target for income.
function ownSide(tx: TransactionResponse, accounts: AccountResponse[]) {
  const target = accounts.find((a) => a.id === tx.targetAccountId);
  const source = accounts.find((a) => a.id === tx.sourceAccountId);
  return !source && target
    ? { amount: tx.targetAmount, currency: tx.targetCurrency, account: target }
    : { amount: tx.sourceAmount, currency: tx.sourceCurrency, account: source };
}

export function ResultCard({ result, onDismiss }: Props) {
  const { t, i18n } = useTranslation();
  // Only names are read here; the list keeps them fresh.
  const { data: accounts = [] } = useAccounts({ refetchOnMount: false });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.dismiss')}
      onPress={onDismiss}
      className="mx-4 mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
    >
      {result.succeeded.map((tx) => {
        const side = ownSide(tx, accounts);
        const amount = formatMoney(side.amount, side.currency, i18n.language);
        return (
          <View key={tx.id} className="py-1">
            <Text className="text-base font-semibold">{tx.description}</Text>
            <Text className="text-sm text-gray-600">
              {side.account ? `${amount} · ${side.account.name}` : amount}
            </Text>
          </View>
        );
      })}
      {result.failed.map((f) => (
        <Text key={f.index} className="py-1 text-sm text-red-600">
          {t('home.failedEntry', { reason: f.reason })}
        </Text>
      ))}
    </Pressable>
  );
}
