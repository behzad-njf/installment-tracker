import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Moon, Sun, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { useTheme } from '@/hooks/useTheme'
import { exportDataFile, importDataFile, loadData } from '@/lib/storage'
import type { Theme } from '@/lib/types'
import { APP_VERSION } from '@/lib/version'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { lang, setLang } = useLocale()
  const { theme, setTheme } = useTheme()
  const { replaceData } = useLoans()
  const [importError, setImportError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const themes: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
    { value: 'light', labelKey: 'settings.light', icon: Sun },
    { value: 'dark', labelKey: 'settings.dark', icon: Moon },
  ]

  const handleExport = () => {
    const json = exportDataFile(loadData())
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const imported = importDataFile(reader.result as string)
      if (!imported) {
        setImportError(t('backup.invalidFile'))
        setRestored(false)
        return
      }
      setImportError(null)
      setRestored(true)
      replaceData(imported)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.settings')}</h1>

      <Section title={t('settings.appearance')} description={t('settings.appearanceHint')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">{t('settings.theme')}</span>
          <div className="flex gap-2" role="group" aria-label={t('settings.theme')}>
            {themes.map(({ value, labelKey, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={theme === value ? 'default' : 'outline'}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon className="size-4 me-1.5" aria-hidden />
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">{t('settings.language')}</span>
          <div className="flex gap-2" role="group" aria-label={t('settings.language')}>
            {(['fa', 'en'] as const).map(value => (
              <Button
                key={value}
                type="button"
                variant={lang === value ? 'default' : 'outline'}
                aria-pressed={lang === value}
                onClick={() => setLang(value)}
              >
                {value === 'fa' ? 'فارسی' : 'English'}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('settings.data')} description={t('settings.dataHint')}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="size-4 me-1.5" aria-hidden />
            {t('backup.export')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4 me-1.5" aria-hidden />
            {t('backup.import')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImportFile}
            aria-label={t('backup.importLabel')}
          />
        </div>
        {importError ? (
          <p className="text-destructive text-xs" role="alert">
            {importError}
          </p>
        ) : null}
        {restored ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">
            {t('backup.restored')}
          </p>
        ) : null}
      </Section>

      <Section title={t('settings.about')}>
        <p className="text-muted-foreground text-sm">
          {t('app.version', { version: APP_VERSION })}
        </p>
      </Section>
    </div>
  )
}
