import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { DollarSign } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatMoney, formatNumber } from '@/lib/money'
import { monthName } from '@/lib/jalali'
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
    </section>
  )
}
