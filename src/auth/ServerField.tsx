import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { displayHost } from './serverUrl';

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ServerField({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  return (
    <View className="mt-6">
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder={t('auth.serverPlaceholder')}
          accessibilityLabel={t('auth.server')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
      ) : (
        <View className="flex-row items-center justify-center">
          <Text className="text-sm text-gray-500">
            {t('auth.server')}: {displayHost(value)}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} className="ml-2">
            <Text className="text-sm text-blue-600">{t('auth.change')}</Text>
          </Pressable>
        </View>
      )}
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
