import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ApiError, NetworkError } from '@/api/client';
import { promptApi } from '@/api/prompt';
import type { PromptResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { accountsQueryKey } from './useAccounts';

interface Props {
  onSend: () => void;
  onResult: (result: PromptResponse) => void;
  onCaptureDisabled: () => void;
}

// Mirrors web QuickAddPrompt: 502 is the LLM upstream, 400 carries a domain message.
function errorMessage(err: unknown, t: TFunction): string {
  if (err instanceof NetworkError) return t('errors.unreachable');
  if (err instanceof ApiError && err.status === 502) return t('home.promptUpstream');
  if (err instanceof ApiError && err.status === 400) return err.message;
  return t('errors.generic');
}

export function PromptBar({ onSend, onResult, onCaptureDisabled }: Props) {
  const { t } = useTranslation();
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const prompt = useMutation({
    mutationFn: (value: string) => promptApi(client).submit({ text: value }),
    onSuccess: (result) => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      onResult(result);
    },
    onError: (err) => {
      // The backend answers 503 only when the LLM is off (PromptAPI.hs).
      if (err instanceof ApiError && err.status === 503) onCaptureDisabled();
    },
  });

  function submit() {
    const value = text.trim();
    if (!value || prompt.isPending) return;
    onSend();
    prompt.mutate(value);
  }

  return (
    <View className="border-t border-gray-200 px-4 py-2">
      {prompt.isError ? (
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="flex-1 text-sm text-red-600">{errorMessage(prompt.error, t)}</Text>
          <Pressable accessibilityRole="button" onPress={submit} className="ml-3">
            <Text className="text-sm font-semibold text-blue-600">{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-center">
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!prompt.isPending}
          accessibilityLabel={t('home.promptLabel')}
          placeholder={t('home.promptPlaceholder')}
          returnKeyType="send"
          onSubmitEditing={submit}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.send')}
          disabled={prompt.isPending}
          onPress={submit}
          className="ml-2 h-10 w-16 items-center justify-center rounded-lg bg-blue-600"
        >
          {prompt.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-semibold text-white">{t('home.send')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
