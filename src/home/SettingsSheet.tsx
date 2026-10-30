import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { setLanguage } from '@/i18n/language';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white p-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-semibold">{t('home.settings')}</Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text className="text-base text-blue-600">{t('home.close')}</Text>
          </Pressable>
        </View>

        <Text className="mt-6 text-sm text-gray-500">{t('home.server')}</Text>
        <Text className="mt-1 text-base">{auth.serverUrl}</Text>

        <Text className="mt-6 text-sm text-gray-500">{t('home.language')}</Text>
        <View className="mt-2 flex-row">
          {SUPPORTED_LANGUAGES.map((lng) => {
            const selected = i18n.language === lng;
            return (
              <Pressable
                key={lng}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => void setLanguage(lng)}
                className={`mr-2 rounded-lg border px-4 py-2 ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
              >
                <Text className="text-base">{t(`languages.${lng}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void auth.signOut()}
          className="mt-10 items-center rounded-lg border border-gray-300 py-3"
        >
          <Text className="text-base text-red-600">{t('home.signOut')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
