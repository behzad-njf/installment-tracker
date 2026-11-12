import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  currentMonthIndex,
  monthIndexFrom,
  monthName,
  yearMonthOf,
  jalaliToDate,
} from '@/lib/jalali'
import { formatNumber, parseMoney } from '@/lib/money'
import type { Loan, LoanDraft, PaymentRecord } from '@/lib/types'

interface Props {
  loan: Loan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddEditLoanDialog({ loan, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { addLoan, updateLoan } = useLoans()
  const { lang } = useLocale()

  const current = yearMonthOf(currentMonthIndex())

  const [name, setName] = useState(loan?.name ?? '')
  const [amount, setAmount] = useState(loan ? String(loan.amount) : '')
  const [startYear, setStartYear] = useState(loan?.startYear ?? current.year)
  const [startMonth, setStartMonth] = useState(loan?.startMonth ?? current.month)
  const [duration, setDuration] = useState(loan?.duration ?? 1)
  const [deadlineDay, setDeadlineDay] = useState(loan?.deadlineDay ?? 1)
  const [previousPaid, setPreviousPaid] = useState<'yes' | 'no' | null>(null)

  const start = monthIndexFrom(startYear, startMonth)
  const isNew = !loan
  const startInPast = start < currentMonthIndex()
  const showPreviousQuestion = isNew && startInPast && previousPaid === null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseMoney(amount)
    if (!name.trim()) return
    if (parsedAmount <= 0) return
    if (!Number.isInteger(startYear) || startYear < 1300 || startYear > 1500) return
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) return

    let payments: PaymentRecord[] = []
    if (isNew && previousPaid === 'yes') {
      const currentMonth = currentMonthIndex()
      for (let m = start; m < currentMonth; m++) {
        const { year: py, month: pm } = yearMonthOf(m)
        payments.push({
          id: crypto.randomUUID(),
          monthIndex: m,
          amount: parsedAmount,
          paidAt: jalaliToDate(py, pm, deadlineDay).toISOString(),
        })
      }
    }

    const draft: LoanDraft = {
      name: name.trim(),
      amount: parsedAmount,
      startYear,
      startMonth,
      duration,
      payments: loan?.payments ?? payments,
      deadlineDay,
    }
    if (loan) {
      updateLoan(loan.id, draft)
    } else {
      addLoan(draft)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loan ? t('loans.edit') : t('loans.add')}</DialogTitle>
          {loan ? <DialogDescription>{loan.name}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {showPreviousQuestion && (
            <div className="grid gap-1.5 p-3 bg-muted border border-border rounded-lg">
              <Label>{t('loans.previousPayments')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={previousPaid === 'yes' ? 'default' : 'outline'}
                  onClick={() => setPreviousPaid('yes')}
                >
                  {t('loans.previousPaidYes')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previousPaid === 'no' ? 'default' : 'outline'}
                  onClick={() => setPreviousPaid('no')}
                >
                  {t('loans.previousPaidNo')}
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="loan-name">{t('loans.name')}</Label>
            <Input
              id="loan-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loan-amount">{t('loans.amount')}</Label>
            <Input
              id="loan-amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={1}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="loan-year">{t('loans.year')}</Label>
              <Input
                id="loan-year"
                type="number"
                value={startYear}
                onChange={e => setStartYear(Number(e.target.value))}
                min={1300}
                max={1500}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="loan-month">{t('loans.month')}</Label>
              <select
                id="loan-month"
                value={startMonth}
                onChange={e => setStartMonth(Number(e.target.value))}
                className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1
                  return (
                    <option key={m} value={m}>
                      {monthName(monthIndexFrom(startYear, m), lang)}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loan-duration">{t('loans.duration')}</Label>
            <Input
              id="loan-duration"
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              min={1}
              max={120}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loan-deadline-day">{t('loans.deadlineDayLabel')}</Label>
            <select
              id="loan-deadline-day"
              value={deadlineDay}
              onChange={e => setDeadlineDay(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>
                  {formatNumber(d, lang)}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('loans.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={showPreviousQuestion && previousPaid === null}
            >
              {t('loans.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
