import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { activeMonthIndices } from '@/lib/loans'
import { monthName, yearMonthOf } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import type { Loan, MonthIndex } from '@/lib/types'

interface Props {
  loan: Loan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentHistoryDialog({ loan, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()

  if (!loan) return null

  const months: MonthIndex[] = activeMonthIndices(loan)

  // Group payments by month index
  const paymentsByMonth = new Map<MonthIndex, typeof loan.payments>()
  for (const payment of loan.payments) {
    const existing = paymentsByMonth.get(payment.monthIndex) ?? []
    existing.push(payment)
    paymentsByMonth.set(payment.monthIndex, existing)
  }

  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
  const paymentCount = loan.payments.length
  const totalDebt = loan.amount * Math.max(1, loan.duration)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center sm:text-lg">{t('loans.history')}</DialogTitle>
          <DialogDescription className="text-center text-[10px]">{loan.name}</DialogDescription>
        </DialogHeader>
        {paymentCount > 0 && (
          <div className="p-1 bg-muted border border-border rounded-lg text-center mb-1">
            <p className="text-xs font-medium">
              {t('payments.summary', {
                paidAmount: formatMoney(totalPaid, lang),
                totalAmount: formatMoney(totalDebt, lang),
                count: formatNumber(paymentCount, lang),
              })}
            </p>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Calendar-square grid: one tile per active month */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {months.map(monthIdx => {
              const payments = paymentsByMonth.get(monthIdx) ?? []
              const { year } = yearMonthOf(monthIdx)
              const monthPaid = payments.reduce((sum, p) => sum + p.amount, 0)
              const remaining = Math.max(0, loan.amount - monthPaid)
              const fullyPaid = monthPaid >= loan.amount
              return (
                <div
                  key={monthIdx}
                  className={`border rounded-lg p-1 flex flex-col min-h-[88px] gap-1 ${
                    fullyPaid ? 'border-green-500/50 bg-green-50/60 dark:bg-green-900/10' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium truncate">
                      {monthName(monthIdx, lang)} {formatYear(year, lang)}
                    </span>
                    {fullyPaid ? (
                      <Check className="size-3.5 shrink-0 text-green-600 dark:text-green-400" aria-label={t('payments.full')} />
                    ) : null}
                  </div>
                  {!fullyPaid && (
                    <div className="text-[9px]">
                      {monthPaid > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {t('payments.partialStatus', {
                            paid: formatMoney(monthPaid, lang),
                            remaining: formatMoney(remaining, lang),
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('loans.status.unpaid')}</span>
                      )}
                    </div>
                  )}
                  {payments.length > 0 && (
                    <div className="flex-1 space-y-0.5 overflow-y-auto max-h-24">
                      {payments.map(payment => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between px-1 py-0.5 border-b border-border/50 last:border-0"
                        >
                          <span className="text-[9px] truncate">
                            {new Date(payment.paidAt).toLocaleDateString(
                              lang === 'fa' ? 'fa-IR' : 'en-US',
                              { year: 'numeric', month: 'numeric', day: 'numeric' },
                            )}
                          </span>
                          <span className="text-[9px] font-medium">
                            {formatMoney(payment.amount, lang)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter className="border-t p-1">
          <Button
            type="button"
            variant="outline"
            className="w-full px-2 py-1.5 text-xs"
            onClick={() => onOpenChange(false)}
          >
            {t('loans.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
