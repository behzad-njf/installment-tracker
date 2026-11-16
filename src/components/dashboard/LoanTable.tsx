import { useTranslation } from 'react-i18next'
import { monthIndexFrom } from '@/lib/jalali'
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/components/ui/table'
import { LoanRow } from '@/components/dashboard/LoanRow'
import { LoanCard } from '@/components/dashboard/LoanCard'
import type { Loan, MonthIndex } from '@/lib/types'

interface Props {
  month: MonthIndex
  loans: Loan[]
  onPay: (id: string, month: number) => void
  onEdit: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onHistory: (loan: Loan) => void
}

export function LoanTable({
  month,
  loans,
  onPay,
  onEdit,
  onDelete,
  onHistory,
}: Props) {
  const { t } = useTranslation()

  const sortedLoans = [...loans].sort((a, b) => {
    const aIdx = monthIndexFrom(a.startYear, a.startMonth)
    const bIdx = monthIndexFrom(b.startYear, b.startMonth)
    return aIdx - bIdx || a.name.localeCompare(b.name)
  })

  return (
    <>
      {/* Desktop: table (no change) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('loans.name')}</TableHead>
              <TableHead>{t('loans.amount')}</TableHead>
              <TableHead>{t('loans.startMonth')}</TableHead>
              <TableHead>{t('loans.statusColumn')}</TableHead>
              <TableHead>{t('loans.remaining')}</TableHead>
              <TableHead>{t('loans.deadline')}</TableHead>
              <TableHead>{t('loans.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLoans.map(loan => (
              <LoanRow
                key={loan.id}
                loan={loan}
                month={month}
                onPay={onPay}
                onEdit={onEdit}
                onDelete={onDelete}
                onHistory={onHistory}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: responsive cards, no horizontal scroll */}
      <div className="md:hidden space-y-2">
        {sortedLoans.map(loan => (
          <LoanCard
            key={loan.id}
            loan={loan}
            month={month}
            onPay={onPay}
            onEdit={onEdit}
            onDelete={onDelete}
            onHistory={onHistory}
          />
        ))}
      </div>
    </>
  )
}
