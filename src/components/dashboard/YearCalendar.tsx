import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, DollarSign, History } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLocale } from '@/hooks/useLocale'
import { currentMonthIndex, monthsOfYear, monthName, yearMonthOf } from '@/lib/jalali'
import { isActiveIn, isFullyPaidIn, isPartiallyPaidIn } from '@/lib/loans'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import type { Loan, MonthIndex } from '@/lib/types'

interface Props {
  loans: Loan[]
  year: number
  onYearChange: (year: number) => void
  onPay?: (loanId: string, monthIdx: number) => void
  onHistory?: (loan: Loan) => void
}

export function YearCalendar({ loans, year, onYearChange, onPay, onHistory }: Props) {
  const { t } = useTranslation()
  const { lang, dir } = useLocale()
  const [selected, setSelected] = useState<MonthIndex | null>(null)

  const months = monthsOfYear(year)
  const now = currentMonthIndex()
  const perMonth = months.map((monthIdx) => {
    const due = loans.filter((loan) => isActiveIn(loan, monthIdx))
    const allPaid = due.length > 0 && due.every((loan) => isFullyPaidIn(loan, monthIdx))
    const anyUnpaid = due.some((loan) => !isFullyPaidIn(loan, monthIdx))
    return {
      monthIdx,
      due,
      total: due.reduce((sum, loan) => sum + loan.amount, 0),
      past: monthIdx < now,
      allPaid,
      anyUnpaid,
    }
  })

  const selectedEntry = perMonth.find((entry) => entry.monthIdx === selected) ?? null
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">{t('calendar.title')}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            aria-label={t('calendar.prevYear')}
            onClick={() => onYearChange(year - 1)}
          >
            <PrevIcon className="size-3.5" />
          </Button>
          <span className="text-xs font-medium tabular-nums">{formatYear(year, lang)}</span>
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            aria-label={t('calendar.nextYear')}
            onClick={() => onYearChange(year + 1)}
          >
            <NextIcon className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {perMonth.map(({ monthIdx, total, due, past, allPaid, anyUnpaid }) => {
            const status =
              allPaid
                ? 'bg-green-50/60 border-green-200/60 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400'
                : past && anyUnpaid
                  ? 'bg-red-50/60 border-red-200/60 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400'
                  : ''
            return (
              <button
                key={monthIdx}
                type="button"
                onClick={() => setSelected(monthIdx)}
                className={`rounded-lg border p-1.5 text-start transition-colors focus-visible:ring-2 focus-visible:ring-ring ${past ? 'opacity-60' : ''} ${total > 0 ? 'border-border hover:bg-accent' : 'border-dashed border-border/60 text-muted-foreground'} ${status}`}
              >
              <div className="text-[11px] font-medium">{monthName(monthIdx, lang)}</div>
              {total > 0 ? (
                <>
                  <div className="text-[10px] tabular-nums">{formatMoney(total, lang)}</div>
                  <div className="text-muted-foreground text-[9px]">
                    {t('calendar.count', { count: formatNumber(due.length, lang) })}
                  </div>
                </>
              ) : (
                <div className="text-[10px]">—</div>
              )}
            </button>
          )})}
        </div>
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-sm">
              {selectedEntry
                ? `${monthName(selectedEntry.monthIdx, lang)} ${formatYear(yearMonthOf(selectedEntry.monthIdx).year, lang)}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && selectedEntry.due.length > 0 ? (
            <div className="space-y-1">
              {selectedEntry.due.map((loan) => {
            const fullyPaid = isFullyPaidIn(loan, selectedEntry.monthIdx)
            const partiallyPaid = isPartiallyPaidIn(loan, selectedEntry.monthIdx)
            const statusLabel = fullyPaid
              ? t('loans.status.paid')
              : partiallyPaid
                ? t('loans.status.partial')
                : t('loans.status.unpaid')
            const statusClass = fullyPaid
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : partiallyPaid
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            return (
              <div key={loan.id} className="flex items-center justify-between gap-2 border-b border-border/50 py-1 text-sm sm:text-xs last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate">{loan.name}</span>
                  <span className={`inline-block px-1.5 py-0 rounded text-[11px] sm:text-[10px] font-medium ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                <span className="shrink-0 tabular-nums">{formatMoney(loan.amount, lang)}</span>
                <div className="flex gap-0.5 shrink-0">
                  {(fullyPaid || partiallyPaid) && onHistory && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      aria-label={t('loans.details')}
                      onClick={() => onHistory(loan)}
                    >
                      <History className="size-3" aria-hidden="true" />
                    </Button>
                  )}
                  {!fullyPaid && onPay && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      aria-label={t('loans.pay')}
                      onClick={() => onPay(loan.id, selectedEntry.monthIdx)}
                    >
                      <DollarSign className="size-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
              <div className="flex items-center justify-between gap-2 pt-1 text-sm sm:text-xs font-semibold">
                <span>{t('common.total')}</span>
                <span className="tabular-nums">{formatMoney(selectedEntry.total, lang)}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-sm sm:text-xs">{t('calendar.empty')}</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
