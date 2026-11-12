import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { updateSettings } from '@/lib/storage'
import type { Lang } from '@/lib/types'

/** Language + text direction, persisted in the data file and mirrored onto <html>. */
export function useLocale() {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.resolvedLanguage === 'en' ? 'en' : 'fa'
  const dir = lang === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = useCallback(
    (next: Lang) => {
      void i18n.changeLanguage(next)
      updateSettings({ lang: next })
    },
    [i18n],
  )

  const toggleLang = useCallback(() => setLang(lang === 'fa' ? 'en' : 'fa'), [lang, setLang])

  return { lang, dir, setLang, toggleLang }
}
