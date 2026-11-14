import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { DollarSign } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatMoney, formatNumber } from '@/lib/money'
import { monthName } from '@/lib/jalali'
import { daysUntilLoanDeadline } from '@/lib/loans'
import type { Loan, MonthIndex } from '@/lib/types'

interface Props {
  loans: Loan[]
  month: MonthIndex
  onPay: (id: string, month: number) => void
}

export function UpcomingDeadlines({ loans, month, onPay }: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()

  return (
    <section className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive" role="alert" aria-live="polite">
      <div className="font-medium mb-2">{t('dashboard.upcomingDeadlines', { count: loans.length })}</div>

      {/* Desktop: table unchanged */}
      <div className="hidden md:block">
        <Table>
          <TableBody>
            {loans.map(loan => (
              <TableRow key={loan.id}>
                <TableCell className="text-xs font-medium truncate max-w-[140px]">
                  {loan.name}
                </TableCell>
                <TableCell className="text-xs text-center tabular-nums">
                  {formatNumber(loan.deadlineDay, lang)} {monthName(month, lang)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatMoney(loan.amount, lang)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={t('loans.pay')}
                    onClick={() => onPay(loan.id, month)}
                  >
                    <DollarSign className="size-4" aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards instead of table */}
      <div className="md:hidden space-y-2">
        {loans.map(loan => {
          const days = daysUntilLoanDeadline(loan, month)
          const label =
            days === null
              ? t('loans.deadlinePaid')
              : days < 0
                ? t('loans.overdue')
                : t('loans.deadlineDay', { day: formatNumber(loan.deadlineDay, lang) })

          return (
            <Card key={loan.id} className="p-3 border-destructive/20">
              <CardContent className="p-0">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {label} — {formatNumber(loan.deadlineDay, lang)} {monthName(month, lang)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-numeric tabular-nums" dir="ltr">
                      {formatMoney(loan.amount, lang)}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label={t('loans.pay')}
                      onClick={() => onPay(loan.id, month)}
                    >
                      <DollarSign className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
