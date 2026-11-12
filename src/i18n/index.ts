import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { peekSettings } from '@/lib/storage'

import en from './locales/en.json'
import fa from './locales/fa.json'

export const resources = {
  fa: { translation: fa },
  en: { translation: en },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: peekSettings().lang,
  fallbackLng: 'fa',
  supportedLngs: ['fa', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
