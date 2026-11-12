import { useCallback, useEffect, useState } from 'react'

import { peekSettings, updateSettings } from '@/lib/storage'
import type { Theme } from '@/lib/types'

/** Class-based dark mode (`.dark` on <html>), persisted in the data file. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => peekSettings().theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    updateSettings({ theme: next })
  }, [])

  return { theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
