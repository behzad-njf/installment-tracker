import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudDownload, CloudUpload, Link2, Unlink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { dateTimeLabel } from '@/lib/jalali'
import {
  GOOGLE_CLIENT_ID,
  backup,
  connect,
  disconnect,
  findBackup,
  isConnected,
  restore,
} from '@/lib/googleDrive'
import { exportDataFile, importDataFile, loadData } from '@/lib/storage'

type Busy = '' | 'connect' | 'backup' | 'restore'

export function GoogleDriveCard() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { replaceData } = useLoans()
  const [connected, setConnected] = useState(isConnected)
  const [busy, setBusy] = useState<Busy>('')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const fail = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : ''
    if (code === 'auth') setConnected(false)
    setError(
      code === 'auth' || code === 'popup_failed_to_open'
        ? t('settings.driveAuthError')
        : t('settings.driveError'),
    )
    setStatus(null)
  }

  const run = async (kind: Busy, action: () => Promise<string>) => {
    setBusy(kind)
    setError(null)
    setStatus(null)
    try {
      setStatus(await action())
      setConnected(true)
    } catch (cause) {
      fail(cause)
    } finally {
      setBusy('')
    }
  }

  const handleConnect = () =>
    run('connect', async () => {
      await connect()
      const existing = await findBackup()
      setLastBackup(existing?.modifiedTime ?? null)
      return t('settings.driveConnected')
    })

  const handleBackup = () =>
    run('backup', async () => {
      const saved = await backup(exportDataFile(loadData()))
      setLastBackup(saved.modifiedTime)
      return t('settings.driveSaved')
    })

  const handleRestore = () =>
    run('restore', async () => {
      setConfirmRestore(false)
      const text = await restore()
      if (!text) throw new Error('empty')
      const imported = importDataFile(text)
      if (!imported) throw new Error('invalid')
      replaceData(imported)
      return t('settings.driveRestored')
    })

  const handleDisconnect = () => {
    disconnect()
    setConnected(false)
    setLastBackup(null)
    setStatus(null)
    setError(null)
  }

  const idle = busy !== ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.drive')}</CardTitle>
        <CardDescription>{t('settings.driveHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {GOOGLE_CLIENT_ID ? null : (
          <p className="text-muted-foreground text-sm">{t('settings.driveMissingClient')}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {connected ? (
            <Button type="button" variant="outline" onClick={handleDisconnect} disabled={idle}>
              <Unlink className="size-4 me-1.5" aria-hidden />
              {t('settings.driveDisconnect')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handleConnect} disabled={idle || !GOOGLE_CLIENT_ID}>
              <Link2 className="size-4 me-1.5" aria-hidden />
              {t('settings.driveConnect')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleBackup} disabled={idle || !GOOGLE_CLIENT_ID}>
            <CloudUpload className="size-4 me-1.5" aria-hidden />
            {t('settings.driveBackup')}
          </Button>
          <Button
            type="button"
            variant={confirmRestore ? 'default' : 'outline'}
            onClick={confirmRestore ? handleRestore : () => setConfirmRestore(true)}
            disabled={idle || !GOOGLE_CLIENT_ID}
          >
            <CloudDownload className="size-4 me-1.5" aria-hidden />
            {confirmRestore ? t('settings.driveRestoreConfirm') : t('settings.driveRestore')}
          </Button>
          {confirmRestore ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmRestore(false)} disabled={idle}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>

        {lastBackup ? (
          <p className="text-muted-foreground text-xs">
            {t('settings.driveLastBackup', { when: dateTimeLabel(lastBackup, lang) })}
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">
            {status}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
