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
import { formatMoney, parseMoney } from '@/lib/money'
import { Calendar } from 'lucide-react'
import type { Loan } from '@/lib/types'
import { activeMonthIndices, isFullyPaidIn } from '@/lib/loans'
import { monthName } from '@/lib/jalali'
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker'

interface Props {
  loan: Loan | null
  monthIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayDialog({ loan, monthIndex, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { addPayment } = useLoans()
  const { lang } = useLocale()

  const paid = loan?.payments.filter(p => p.monthIndex === monthIndex).reduce((sum, p) => sum + p.amount, 0) ?? 0
  const remaining = loan ? Math.max(0, loan.amount - paid) : 0

  const monthPayments = loan?.payments
    .filter(p => p.monthIndex === monthIndex)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt)) ?? []

  const [date, setDate] = useState(() => new Date().toISOString())
  const [payMonth, setPayMonth] = useState(monthIndex)

  if (!loan) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const amountInput = form.elements.namedItem('pay-amount') as HTMLInputElement | null
    const parsedAmount = parseMoney(amountInput?.value ?? '')
    if (!date) return
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    addPayment(loan.id, payMonth, parsedAmount, date)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('loans.payTitle')}</DialogTitle>
          <DialogDescription>{loan.name}</DialogDescription>
        </DialogHeader>
        {monthPayments.length > 0 && (
          <div className="p-2 bg-muted border border-border rounded-lg mb-2">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-medium text-muted-foreground">
              <Calendar className="size-3" />
              <span>{t('loans.paymentsAlready')}</span>
            </div>
            <div className="space-y-0.5">
              {monthPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    {new Date(p.paidAt).toLocaleDateString(
                      lang === 'fa' ? 'fa-IR' : 'en-US',
                      { year: 'numeric', month: 'numeric', day: 'numeric' },
                    )}
                  </span>
                  <span className="font-medium">{formatMoney(p.amount, lang)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50 text-[10px] font-medium">
                <span>{t('common.total')}</span>
                <span>{formatMoney(paid, lang)}</span>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 p-4">
          <div className="grid gap-2">
            <Label htmlFor="pay-month">{t('loans.payMonth')}</Label>
            <select
              id="pay-month"
              name="pay-month"
              value={payMonth}
              onChange={e => setPayMonth(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent flex-1"
            >
              {activeMonthIndices(loan)
                .filter(m => !isFullyPaidIn(loan, m))
                .map(m => {
                  const y = Math.floor(m / 12)
                  return (
                    <option key={m} value={m}>
                      {monthName(m, lang)} {y}
                    </option>
                  )
                })}
            </select>
          </div>
          <div className="grid gap-2">
            <JalaliDatePicker label={t('loans.paymentDate')} onChange={setDate} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-amount">{t('loans.amount')}</Label>
            <div className="flex items-baseline gap-1">
              <Input
                id="pay-amount"
                name="pay-amount"
                type="text"
                defaultValue={formatMoney(remaining, lang)}
                placeholder={formatMoney(remaining, lang)}
                min="0"
                required
                className="border border-border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <span className="text-muted-foreground text-xs">{t('common.toman')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('loans.cancel')}
            </Button>
            <Button type="submit">{t('loans.pay')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
