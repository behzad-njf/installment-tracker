import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlarmClock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckStatusDialog } from '@/components/checks/CheckStatusDialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { daysUntilCheckDue, overdueChecks, upcomingChecks } from '@/lib/checks'
import { monthName, monthIndexFrom } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import type { Check } from '@/lib/types'

export function NearDueChecks({ checks }: { checks: Check[] }) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { setCheckStatus } = useLoans()
  const [statusCheck, setStatusCheck] = useState<Check | null>(null)

  const near = [...overdueChecks(checks), ...upcomingChecks(checks, 7)]
  if (near.length === 0) return null

  const handleStatus = (id: string, status: 'cleared' | 'bounced' | 'void') => {
    const ok = setCheckStatus(id, status)
    if (!ok) {
      // eslint-disable-next-line no-console
      console.warn(t('checks.statusNotAllowed'))
    }
  }

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
                onClick={() => setStatusCheck(check)}
              >
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2 font-medium truncate">
                    {check.payee || `${t('checks.serial')} ${formatNumber(check.serial ?? 0, lang)}`}
                  </div>
                  <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                    <span className="truncate">{dueLabel}</span>
                    {daysLabel ? (
                      <Badge variant={days !== null && days < 0 ? 'destructive' : 'secondary'}>
                        {daysLabel}
                      </Badge>
                    ) : null}
                  </div>
                  {check.purpose ? (
                    <div className="col-span-2 text-xs text-muted-foreground truncate">
                      {t('checks.purpose')}: {check.purpose}
                    </div>
                  ) : null}
                  <div className="col-span-2 tabular-nums font-medium">
                    {formatMoney(check.amount, lang)} {t('common.toman')}
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation()
                      handleStatus(check.id, 'cleared')
                    }}
                  >
                    {t('checks.action.cleared')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation()
                      handleStatus(check.id, 'bounced')
                    }}
                  >
                    {t('checks.action.bounced')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={e => {
                      e.stopPropagation()
                      handleStatus(check.id, 'void')
                    }}
                  >
                    {t('checks.action.void')}
                  </Button>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      {statusCheck ? (
        <CheckStatusDialog
          check={statusCheck}
          onOpenChange={open => {
            if (!open) setStatusCheck(null)
          }}
          onSubmit={(status, patch) => {
            const ok = setCheckStatus(statusCheck!.id, status, patch)
            if (!ok) {
              // eslint-disable-next-line no-console
              console.warn(t('checks.statusNotAllowed'))
            }
            return ok
          }}
        />
      ) : null}
    </Card>
  )
}
