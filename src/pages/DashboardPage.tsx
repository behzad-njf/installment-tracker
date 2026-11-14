import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart2, Calendar } from 'lucide-react'

import { BreakdownChart } from '@/components/dashboard/BreakdownChart'
import { PayDialog } from '@/components/dashboard/PayDialog'
import { PaymentHistoryDialog } from '@/components/dashboard/PaymentHistoryDialog'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { YearCalendar } from '@/components/dashboard/YearCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/hooks/useLocale'
import { useLoans } from '@/hooks/useLoans'
import { currentMonthIndex, todayLabel, yearMonthOf } from '@/lib/jalali'
import { daysUntilLoanDeadline, remainingInstallments, summaryFor } from '@/lib/loans'
import type { Loan } from '@/lib/types'

interface PayContext {
  id: string
  month: number
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { loans } = useLoans()
  const month = useMemo(() => currentMonthIndex(), [])
  const chartYear = useMemo(() => yearMonthOf(month).year, [month])
  const summary = useMemo(() => summaryFor(loans, month), [loans, month])
  const nextSummary = useMemo(() => summaryFor(loans, month + 1), [loans, month])

  const upcomingDeadlines = useMemo(
    () =>
      loans
        .filter(l => remainingInstallments(l) > 0)
        .filter(l => l.deadlineDay >= 1 && l.deadlineDay <= 31)
        .filter(l => {
          const days = daysUntilLoanDeadline(l, month)
          return typeof days === 'number' && days >= 0 && days <= 3
        }),
    [loans, month]
  )

  const overdueLoans = useMemo(
    () =>
      loans
        .filter(l => remainingInstallments(l) > 0)
        .filter(l => l.deadlineDay >= 1 && l.deadlineDay <= 31)
        .filter(l => {
          const days = daysUntilLoanDeadline(l, month)
          return typeof days === 'number' && days < 0
        }),
    [loans, month]
  )

  const [calYear, setCalYear] = useState(chartYear)
  const [mobileView, setMobileView] = useState<'chart' | 'calendar'>('calendar')
  const [payDialog, setPayDialog] = useState<PayContext | null>(null)
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null)

  return (
    <div className="space-y-5">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.overview')}</h1>
        <p className="text-muted-foreground text-xs sm:hidden">{todayLabel(lang)}</p>
      </div>

      <SummaryCards summary={summary} nextMonthAmount={nextSummary.totalMonthly} />

      {upcomingDeadlines.length > 0 && (
        <UpcomingDeadlines
          loans={upcomingDeadlines}
          month={month}
          onPay={loanId => setPayDialog({ id: loanId, month })}
        />
      )}

      {overdueLoans.length > 0 && (
        <div
          className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-300 text-sm"
          role="alert"
          aria-live="polite"
        >
          {t('dashboard.overdueLoans', { count: overdueLoans.length })}
        </div>
      )}

      <div className="hidden md:grid md:grid-cols-2 gap-3">
        <Card>
          <CardContent>
            <BreakdownChart loans={loans} year={chartYear} />
          </CardContent>
        </Card>
        <YearCalendar
          loans={loans}
          year={calYear}
          onYearChange={setCalYear}
          onPay={(loanId, monthIdx) => setPayDialog({ id: loanId, month: monthIdx })}
          onHistory={loan => setHistoryLoan(loan)}
        />
      </div>

      <div className="md:hidden space-y-4">
        <div className="flex gap-2 border-b border-border pb-1">
          <Button
            type="button"
            size="sm"
            variant={mobileView === 'chart' ? 'default' : 'outline'}
            onClick={() => setMobileView('chart')}
          >
            <BarChart2 className="size-4 ms-1.5" aria-hidden />
            {t('dashboard.chart')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mobileView === 'calendar' ? 'default' : 'outline'}
            onClick={() => setMobileView('calendar')}
          >
            <Calendar className="size-4 ms-1.5" aria-hidden />
            {t('dashboard.calendar')}
          </Button>
        </div>
        {mobileView === 'chart' ? (
          <Card>
            <CardContent>
              <BreakdownChart loans={loans} year={chartYear} />
            </CardContent>
          </Card>
        ) : (
          <YearCalendar
            loans={loans}
            year={calYear}
            onYearChange={setCalYear}
            onPay={(loanId, monthIdx) => setPayDialog({ id: loanId, month: monthIdx })}
            onHistory={loan => setHistoryLoan(loan)}
          />
        )}
      </div>

      <PayDialog
        key={payDialog?.month ?? 0}
        loan={loans.find(l => l.id === payDialog?.id) ?? null}
        monthIndex={payDialog?.month ?? 0}
        open={payDialog !== null}
        onOpenChange={open => {
          if (!open) setPayDialog(null)
        }}
      />
      <PaymentHistoryDialog
        loan={historyLoan}
        open={historyLoan !== null}
        onOpenChange={open => {
          if (!open) setHistoryLoan(null)
        }}
      />
    </div>
  )
}
