import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import pl from './locales/pl.json';
import sv from './locales/sv.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pl: { translation: pl },
  sv: { translation: sv }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.split('-')[0] || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;