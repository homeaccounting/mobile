import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';

export default function Home() {
  const { t } = useTranslation();
  const auth = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-semibold">{t('home.title')}</Text>
      <Text className="mt-2 text-base text-gray-500">{t('home.tagline')}</Text>
      {/* Temporary: tracker#89 replaces this with the settings sheet. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => void auth.signOut()}
        className="mt-8 rounded-lg border border-gray-300 px-4 py-2"
      >
        <Text className="text-base">{t('home.signOut')}</Text>
      </Pressable>
    </View>
  );
}
