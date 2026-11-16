import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, History, Edit, Trash2 } from 'lucide-react'
import { formatMoney, formatNumber } from '@/lib/money'
import {
  isFullyPaidIn,
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
  const remainingCount = remainingInstallments(loan)
  const settled = fullyPaid || finished

  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate mb-1">{loan.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="font-semibold">
                {formatNumber(remainingCount, lang)} {t('loans.installmentUnit')}
              </span>
              <span className="px-0.5">-</span>
              <span>{formatMoney(loan.amount, lang)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  settled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {settled ? t('loans.status.paid') : t('loans.status.unpaid')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
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
            </div>
            <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  )
}
