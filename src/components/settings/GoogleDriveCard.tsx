import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudDownload, CloudUpload, Link2, Unlink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { dateTimeLabel } from '@/lib/jalali'
import {
  GOOGLE_CLIENT_ID,
  backup,
  connect,
  disconnect,
  findBackup,
  getUser,
  isConnected,
  restore,
} from '@/lib/googleDrive'
import { exportDataFile, importDataFile, loadData } from '@/lib/storage'

type Busy = '' | 'connect' | 'backup' | 'restore'
type ConfirmAction = 'disconnect' | 'backup' | 'restore' | null

export function GoogleDriveCard() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { replaceData } = useLoans()
  const [connected, setConnected] = useState(isConnected)
  const [busy, setBusy] = useState<Busy>('')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressOp, setProgressOp] = useState<'backup' | 'restore' | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

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
    setProgress(0)
    setProgressOp(kind === 'backup' ? 'backup' : kind === 'restore' ? 'restore' : null)
    try {
      setStatus(await action())
      setConnected(true)
    } catch (cause) {
      fail(cause)
    } finally {
      setBusy('')
      setProgressOp(null)
      setProgress(0)
    }
  }

  const handleConnect = () =>
    run('connect', async () => {
      await connect()
      try {
        const user = await getUser()
        setEmail(user?.emailAddress ?? null)
      } catch {
        setEmail(null)
      }
      const existing = await findBackup()
      setLastBackup(existing?.modifiedTime ?? null)
      return t('settings.driveConnected')
    })

  const handleBackup = () => run('backup', async () => {
    const saved = await backup(exportDataFile(loadData()))
    setLastBackup(saved.modifiedTime)
    return t('settings.driveSaved')
  })

  const handleRestore = () =>
    run('restore', async () => {
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
    setEmail(null)
  }

  const doConfirm = () => {
    if (confirmAction === 'disconnect') {
      handleDisconnect()
    } else if (confirmAction === 'backup') {
      handleBackup()
    } else if (confirmAction === 'restore') {
      handleRestore()
    }
    setConfirmAction(null)
  }

  const idle = busy !== ''

  // Re-fetch user email + last backup on mount so they show after reconnect/reload
  useEffect(() => {
    if (!connected) return
    let cancelled = false
    ;(async () => {
      try {
        const [user, existing] = await Promise.all([
          getUser(),
          findBackup(),
        ])
        if (cancelled) return
        setEmail(user?.emailAddress ?? null)
        setLastBackup(existing?.modifiedTime ?? null)
      } catch {
        if (cancelled) return
        setEmail(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connected])

  // Simulated progress while waiting on network
  useEffect(() => {
    if (progressOp === null) return
    let p = 0
    const id = setInterval(() => {
      p += 12
      if (p > 90) p = 90
      setProgress(p)
    }, 150)
    return () => clearInterval(id)
  }, [progressOp])

  useEffect(() => {
    if (progressOp === null || progress >= 100) return
    const id = setTimeout(() => setProgress(100), 900)
    return () => clearTimeout(id)
  }, [progressOp, progress])

  const confirmLabels: Record<Exclude<ConfirmAction, null>, string> = {
    disconnect: t('settings.driveConfirmDisconnect'),
    backup: t('settings.driveConfirmBackup'),
    restore: t('settings.driveConfirmRestore'),
  }

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

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50/60 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium border border-emerald-100/60 dark:border-emerald-800/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                {t('settings.driveConnectedLabel')}
              </span>
            ) : (
              <Button type="button" variant="outline" onClick={handleConnect} disabled={idle || !GOOGLE_CLIENT_ID}>
                <Link2 className="size-4 me-1.5" aria-hidden />
                {t('settings.driveConnect')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <Button type="button" variant="outline" onClick={() => setConfirmAction('disconnect')} disabled={idle}>
                <Unlink className="size-4 me-1.5" aria-hidden />
                {t('settings.driveDisconnect')}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setConfirmAction('backup')} disabled={idle || !GOOGLE_CLIENT_ID}>
              <CloudUpload className="size-4 me-1.5" aria-hidden />
              {t('settings.driveBackup')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmAction('restore')} disabled={idle || !GOOGLE_CLIENT_ID}>
              <CloudDownload className="size-4 me-1.5" aria-hidden />
              {t('settings.driveRestore')}
            </Button>
          </div>
        </div>

        {connected && email ? (
          <p className="text-muted-foreground text-xs">
            {t('settings.driveEmail', { email })}
          </p>
        ) : null}

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

        {progressOp !== null && progress > 0 && (
          <Dialog open={true}>
            <DialogContent className="p-4">
              <DialogHeader>
                <DialogTitle>
                  {progressOp === 'backup' ? t('settings.driveProgressBackup') : t('settings.driveProgressRestore')}
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="mt-2 space-y-2">
                <div className="w-full bg-secondary/30 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('settings.driveProgressPercent', { percent: progress })}
                </p>
              </DialogDescription>
            </DialogContent>
          </Dialog>
        )}

        {confirmAction !== null && (
          <Dialog open={true}>
            <DialogContent className="p-4">
              <DialogHeader>
                <DialogTitle>{t('settings.driveConfirmTitle')}</DialogTitle>
              </DialogHeader>
              <DialogDescription className="mt-2 text-sm">
                {confirmLabels[confirmAction]}
              </DialogDescription>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
                  {t('settings.driveConfirmNo')}
                </Button>
                <Button type="button" variant="destructive" onClick={doConfirm} disabled={idle}>
                  {t('settings.driveConfirmYes')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
