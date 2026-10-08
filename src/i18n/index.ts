import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import uk from './locales/uk.json';

export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const;

const i18n = createInstance();

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, uk: { translation: uk } },
  lng: deviceLanguage,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
});

export default i18n;
