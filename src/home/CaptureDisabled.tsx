import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const SELF_HOST_DOCS_URL = 'https://github.com/homeaccounting/docker#optional-features';

export function CaptureDisabled() {
  const { t } = useTranslation();
  return (
    <View className="border-t border-gray-200 px-4 py-3">
      <Text className="text-base font-semibold">{t('home.captureDisabled')}</Text>
      <Text className="mt-1 text-sm text-gray-600">{t('home.captureDisabledHint')}</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(SELF_HOST_DOCS_URL)}
        className="mt-2"
      >
        <Text className="text-sm text-blue-600">{t('home.selfHostDocs')}</Text>
      </Pressable>
    </View>
  );
}
