import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import { TableRow, TableCell } from '@/components/ui/table'
import { History, Edit, Trash2 } from 'lucide-react'
import { monthIndexFrom, monthLabel } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import {
  daysUntilLoanDeadline,
  isFullyPaidIn,
  isPartiallyPaidIn,
  loanStatus,
  paidAmountIn,
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

export function LoanRow({
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
  const paidAmount = fullyPaid || partiallyPaid ? paidAmountIn(loan, month) : 0
  const statusLabel = finished
    ? t('loans.status.finished')
    : fullyPaid
      ? t('loans.status.paid')
      : partiallyPaid
        ? t('loans.status.partial')
        : t('loans.status.unpaid')
  const remainingCount = remainingInstallments(loan)
  const deadlineInfo = daysUntilLoanDeadline(loan, month)
  const deadlineOverdue = typeof deadlineInfo === 'number' && deadlineInfo < 0

  return (
    <TableRow>
      <TableCell>{loan.name}</TableCell>
      <TableCell>{formatMoney(loan.amount, lang)}</TableCell>
      <TableCell>
        {monthLabel(
          monthIndexFrom(loan.startYear, loan.startMonth),
          lang,
          (y) => formatYear(y, lang),
        )}
      </TableCell>
      <TableCell>{formatNumber(loan.duration, lang)}</TableCell>
      <TableCell>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          finished || fullyPaid
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : partiallyPaid
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {statusLabel}
          {paidAmount > 0 ? ` (${formatMoney(paidAmount, lang)})` : ''}
        </span>
      </TableCell>
      <TableCell className="text-center text-sm font-medium text-muted-foreground">
        {t('loans.remainingCount', { count: formatNumber(remainingCount, lang) })}
      </TableCell>
      <TableCell
        className={`text-center text-sm font-medium ${deadlineOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}
      >
        {finished ? null : (
          <>
            <div>{t('loans.deadlineDay', { day: formatNumber(loan.deadlineDay, lang) })}</div>
            {deadlineInfo === null ? (
              <div className="text-[10px] text-green-600 dark:text-green-400">
                {t('loans.deadlinePaid')}
              </div>
            ) : deadlineOverdue ? (
              <div className="text-[10px] text-red-600 dark:text-red-400">{t('loans.overdue')}</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">
                {t('loans.daysUntilDeadline', { days: formatNumber(deadlineInfo, lang) })}
              </div>
            )}
          </>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPay(loan.id, month)}
            disabled={fullyPaid || finished}
          >
            {t('loans.pay')}
            {fullyPaid ? ' ' : ''}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t('loans.history')}
            onClick={() => onHistory(loan)}
          >
            <History />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t('loans.edit')}
            onClick={() => onEdit(loan)}
          >
            <Edit />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label={t('loans.delete')}
            onClick={() => onDelete(loan)}
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
