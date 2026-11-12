import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, History, Edit, Trash2 } from 'lucide-react'
import { monthIndexFrom, monthLabel } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import {
  daysUntilLoanDeadline,
  isFullyPaidIn,
  isPartiallyPaidIn,
  loanStatus,
  remainingInstallments,
} from '@/lib/loans'
import type { Loan, MonthIndex } from '@/lib/types'

interface Props {
  loan: Loan
  month: MonthIndex
  onPay: (id: string, month: number) => void
  onEdit: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onHistory: (loan: Loan) => void
}

export function LoanCard({
  loan,
  month,
  onPay,
  onEdit,
  onDelete,
  onHistory,
}: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()

  const status = loanStatus(loan, month)
  const finished = status === 'finished'
  const fullyPaid = isFullyPaidIn(loan, month)
  const partiallyPaid = isPartiallyPaidIn(loan, month)
  const statusLabel = finished
    ? t('loans.status.finished')
    : fullyPaid
      ? t('loans.status.paid')
      : partiallyPaid
        ? t('loans.status.partial')
        : t('loans.status.unpaid')
  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
  const totalDebt = loan.amount * Math.max(1, loan.duration)
  const remainingAmount = Math.max(0, totalDebt - totalPaid)
  const remainingCount = remainingInstallments(loan)
  const deadlineInfo = daysUntilLoanDeadline(loan, month)
  const deadlineOverdue = typeof deadlineInfo === 'number' && deadlineInfo < 0

  const badgeClass = `inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
    finished || fullyPaid
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : partiallyPaid
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }`

  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{loan.name}</span>
              <span className={badgeClass}>{statusLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{formatMoney(loan.amount, lang)}</span>
              <span>
                {monthLabel(
                  monthIndexFrom(loan.startYear, loan.startMonth),
                  lang,
                  (y) => formatYear(y, lang),
                )}
              </span>
              <span>{formatNumber(loan.duration, lang)} ماه</span>
            </div>
            <div className="text-sm font-medium">{formatMoney(remainingAmount, lang)}</div>
            <div className="text-xs text-muted-foreground">
              {t('loans.remainingCount', { count: formatNumber(remainingCount, lang) })}
            </div>
            {!finished && (
              <div className="text-xs text-muted-foreground mt-1">
                {deadlineInfo === null ? (
                  <span className="text-green-600 dark:text-green-400">
                    {t('loans.deadlinePaid')}
                  </span>
                ) : deadlineOverdue ? (
                  <span className="text-red-600 dark:text-red-400">
                    {t('loans.overdue')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t('loans.daysUntilDeadline', {
                      days: formatNumber(deadlineInfo, lang),
                    })}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={fullyPaid || finished}
              aria-label={t('loans.pay')}
              onClick={() => onPay(loan.id, month)}
            >
              <DollarSign className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={t('loans.history')}
              onClick={() => onHistory(loan)}
            >
              <History className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={t('loans.edit')}
              onClick={() => onEdit(loan)}
            >
              <Edit className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label={t('loans.delete')}
              onClick={() => onDelete(loan)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
