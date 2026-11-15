import { useTranslation } from 'react-i18next'
import { AlarmClock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/hooks/useLocale'
import { daysUntilCheckDue, overdueChecks, upcomingChecks } from '@/lib/checks'
import { monthName, monthIndexFrom } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import type { Check, Checkbook } from '@/lib/types'

interface Props {
  checks: Check[]
  checkbooks: Checkbook[]
  onSelectBook: (bookId: string) => void
}

export function NearDueChecks({ checks, checkbooks, onSelectBook }: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()

  const near = [...overdueChecks(checks), ...upcomingChecks(checks, 7)]
  if (near.length === 0) return null

  return (
    <Card className="p-3 space-y-2" role="alert">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlarmClock className="size-4 text-destructive" aria-hidden />
        {t('checks.nearDue')}
      </div>
      <ul className="space-y-1.5">
        {near.map(check => {
          const days = daysUntilCheckDue(check)
          const book = checkbooks.find(b => b.id === check.checkbookId)
          const dueLabel = check.dueDay !== undefined && check.dueYear !== undefined && check.dueMonth !== undefined
            ? `${formatNumber(check.dueDay, lang)} ${monthName(monthIndexFrom(check.dueYear, check.dueMonth), lang)}`
            : '—'
          return (
            <li key={check.id}>
              <button
                type="button"
                className="w-full rounded-md border p-2 text-start text-sm hover:bg-accent"
                onClick={() => onSelectBook(check.checkbookId)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {check.payee || `${t('checks.serial')} ${formatNumber(check.serial ?? 0, lang)}`}
                  </span>
                  <Badge variant={days !== null && days < 0 ? 'destructive' : 'secondary'}>{days !== null && days < 0 ? t('checks.overdueDays', { days: formatNumber(Math.abs(days), lang) }) : t('loans.daysRemaining', { days: formatNumber(days ?? 0, lang) })}</Badge>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{book?.name ?? ''} · {dueLabel}</span>
                  <span className="tabular-nums">{formatMoney(check.amount, lang)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}