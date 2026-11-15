import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlarmClock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { daysUntilCheckDue, overdueChecks, upcomingChecks } from '@/lib/checks'
import { monthName, monthIndexFrom } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import type { Check } from '@/lib/types'

type StatusAction = 'cleared' | 'bounced' | 'void'

export function NearDueChecks({ checks }: { checks: Check[] }) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { setCheckStatus } = useLoans()
  const [summaryCheck, setSummaryCheck] = useState<Check | null>(null)
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: StatusAction } | null>(null)

  const near = [...overdueChecks(checks), ...upcomingChecks(checks, 7)]
  if (near.length === 0) return null

  const statusColor = (s: Check['status']) =>
    s === 'issued'
      ? 'text-green-700'
      : s === 'cleared'
        ? 'text-blue-700'
        : s === 'bounced'
          ? 'text-orange-700'
          : s === 'void'
            ? 'text-destructive'
            : 'text-muted-foreground'

  /** Open details dialog for one check. */
  const openSummary = (check: Check) => setSummaryCheck(check)

  /** Details open: click a status button → close details, open confirmation. */
  const requestStatus = (status: StatusAction) => {
    if (!summaryCheck) return
    const id = summaryCheck.id
    setSummaryCheck(null)
    setPendingStatus({ id, status })
  }

  const applyPending = () => {
    if (!pendingStatus) return
    const ok = setCheckStatus(pendingStatus.id, pendingStatus.status)
    if (!ok) {
      // eslint-disable-next-line no-console
      console.warn(t('checks.statusNotAllowed'))
    }
    setPendingStatus(null)
  }

  const statusLabel = (s: StatusAction) => t(`checks.status.${s}`)

  return (
    <Card className="p-3 space-y-2" role="alert">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlarmClock className="size-4 text-destructive" aria-hidden />
        {t('checks.nearDue')}
      </div>
      <ul className="space-y-1.5">
        {near.map(check => {
          const days = daysUntilCheckDue(check)
          const dueLabel =
            check.dueDay !== undefined && check.dueYear !== undefined && check.dueMonth !== undefined
              ? `${formatNumber(check.dueDay, lang)} ${monthName(monthIndexFrom(check.dueYear, check.dueMonth), lang)}`
              : '—'
          const daysLabel =
            days !== null
              ? days < 0
                ? t('checks.overdueDays', { days: formatNumber(Math.abs(days), lang) })
                : t('loans.daysRemaining', { days: formatNumber(days, lang) })
              : ''
          return (
            <li key={check.id}>
              <button
                type="button"
                className="w-full rounded-md border p-2 text-start hover:bg-accent"
                onClick={() => openSummary(check)}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-start">
                    {check.payee || `${t('checks.serial')} ${formatNumber(check.serial ?? 0, lang)}`}
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">{dueLabel}</span>
                  {daysLabel ? (
                    <Badge variant={days !== null && days < 0 ? 'destructive' : 'secondary'}>
                      {daysLabel}
                    </Badge>
                  ) : null}
                </div>
                {check.purpose ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate">{check.purpose}</span>
                    <span className="tabular-nums font-medium whitespace-nowrap">
                      {formatMoney(check.amount, lang)} {t('common.toman')}
                    </span>
                  </div>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {summaryCheck ? (
        <Dialog open onOpenChange={open => {
          if (!open) setSummaryCheck(null)
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('checks.checkDetails')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-input pb-1 text-sm">
                <span className="text-muted-foreground">{t('checks.serial')}</span>
                <span dir="ltr">{summaryCheck.serial}</span>
              </div>
              <div className="flex justify-between border-b border-input pb-1 text-sm">
                <span className="text-muted-foreground">{t('checks.payee')}</span>
                <span className="truncate">{summaryCheck.payee || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-input pb-1 text-sm">
                <span className="text-muted-foreground">{t('checks.amount')}</span>
                <span dir="ltr">
                  {formatMoney(summaryCheck.amount, lang)} {t('common.toman')}
                </span>
              </div>
              {summaryCheck.purpose ? (
                <div className="flex justify-between border-b border-input pb-1 text-sm">
                  <span className="text-muted-foreground">{t('checks.purpose')}</span>
                  <span className="truncate">{summaryCheck.purpose}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-b border-input pb-1 text-sm">
                <span className="text-muted-foreground">{t('checks.dueDate')}</span>
                <span>
                  {summaryCheck.dueDay !== undefined
                    ? `${formatNumber(summaryCheck.dueDay, lang)} ${monthName(monthIndexFrom(summaryCheck.dueYear ?? 0, summaryCheck.dueMonth ?? 1), lang)} ${formatYear(summaryCheck.dueYear ?? 0, lang)}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-input pb-1 text-sm">
                <span className="text-muted-foreground">{t('checks.statusLabel')}</span>
                <span className={`text-sm font-medium ${statusColor(summaryCheck.status)}`}>
                  {t(`checks.status.${summaryCheck.status}`)}
                </span>
              </div>
              {summaryCheck.note ? (
                <div className="flex justify-between border-b border-input pb-1 text-sm">
                  <span className="text-muted-foreground">{t('checks.note')}</span>
                  <span className="truncate">{summaryCheck.note}</span>
                </div>
              ) : null}
            </div>
            <DialogFooter className="flex flex-row gap-2 justify-center">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => requestStatus('cleared')}
              >
                {t('checks.action.cleared')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-orange-500 text-orange-700 hover:bg-orange-50"
                onClick={() => requestStatus('bounced')}
              >
                {t('checks.action.bounced')}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => requestStatus('void')}>
                {t('checks.action.void')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {pendingStatus ? (
        <Dialog open onOpenChange={open => {
          if (!open) setPendingStatus(null)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('checks.confirmStatusTitle')}</DialogTitle>
              <DialogDescription>
                {t('checks.confirmStatusDesc', { status: statusLabel(pendingStatus.status) })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingStatus(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" variant="destructive" onClick={applyPending}>
                {statusLabel(pendingStatus.status)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </Card>
  )
}
