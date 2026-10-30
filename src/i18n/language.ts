import * as SecureStore from 'expo-secure-store';
import i18n, { SUPPORTED_LANGUAGES } from './index';

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const KEY = 'ha.language';

const isSupported = (l: string | null): l is Language =>
  (SUPPORTED_LANGUAGES as readonly (string | null)[]).includes(l);

/** Applies the language chosen in settings; without one, the device language stays. */
export async function loadLanguage(): Promise<void> {
  const saved = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (isSupported(saved)) await i18n.changeLanguage(saved);
}

export async function setLanguage(lng: Language): Promise<void> {
  await i18n.changeLanguage(lng);
  await SecureStore.setItemAsync(KEY, lng);
}
