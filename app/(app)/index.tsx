import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { PromptResponse } from '@/api/types';
import { AccountList } from '@/home/AccountList';
import { CaptureDisabled } from '@/home/CaptureDisabled';
import { PromptBar } from '@/home/PromptBar';
import { ResultCard } from '@/home/ResultCard';
import { SettingsSheet } from '@/home/SettingsSheet';

export default function Home() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<PromptResponse | null>(null);
  // Screen state is enough to remember it until sign-out: signing out unmounts this screen.
  const [captureDisabled, setCaptureDisabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-semibold">{t('home.title')}</Text>
        <Pressable accessibilityRole="button" onPress={() => setSettingsOpen(true)}>
          <Text className="text-base text-blue-600">{t('home.settings')}</Text>
        </Pressable>
      </View>
      <AccountList />
      {result ? <ResultCard result={result} onDismiss={() => setResult(null)} /> : null}
      {captureDisabled ? (
        <CaptureDisabled />
      ) : (
        <PromptBar
          onSend={() => setResult(null)}
          onResult={setResult}
          onCaptureDisabled={() => setCaptureDisabled(true)}
        />
      )}
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </KeyboardAvoidingView>
  );
}
