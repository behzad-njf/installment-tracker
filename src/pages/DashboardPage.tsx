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
import { deadlineBuckets, summaryFor } from '@/lib/loans'
import { checksDueTotal, checksClearedTotal, upcomingChecks } from '@/lib/checks'
import { formatNumber } from '@/lib/money'
import type { Loan } from '@/lib/types'

interface PayContext {
  id: string
  month: number
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { loans, checks } = useLoans()
  const month = useMemo(() => currentMonthIndex(), [])
  const chartYear = useMemo(() => yearMonthOf(month).year, [month])
  const summary = useMemo(() => summaryFor(loans, month), [loans, month])
  const nextSummary = useMemo(() => summaryFor(loans, month + 1), [loans, month])
  const checksIssuedThisMonth = useMemo(() => checksDueTotal(checks, month), [checks, month])
  const checksClearedThisMonth = useMemo(() => checksClearedTotal(checks, month), [checks, month])
  const checksIssuedNextMonth = useMemo(() => checksDueTotal(checks, month + 1), [checks, month])
  const nearChecks = useMemo(() => upcomingChecks(checks, 5), [checks])

  const { upcoming: upcomingDeadlines, overdue: overdueLoans } = useMemo(
    () => deadlineBuckets(loans, month),
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

      <SummaryCards
        summary={summary}
        nextMonthAmount={nextSummary.totalMonthly}
        checksIssuedThisMonth={checksIssuedThisMonth}
        checksClearedThisMonth={checksClearedThisMonth}
        checksIssuedNextMonth={checksIssuedNextMonth}
      />

      {upcomingDeadlines.length > 0 && (
        <UpcomingDeadlines
          loans={upcomingDeadlines}
          month={month}
          onPay={loanId => setPayDialog({ id: loanId, month })}
        />
      )}

      {nearChecks.length > 0 && (
        <div
          className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-amber-700 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-300 text-sm"
          role="alert"
          aria-live="polite"
        >
          {t('dashboard.nearDueChecks', {
            count: formatNumber(nearChecks.length, lang),
          })}
        </div>
      )}

      {overdueLoans.length > 0 && (
        <div
          className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-300 text-sm"
          role="alert"
          aria-live="polite"
        >
          {t('dashboard.overdueLoans', { count: formatNumber(overdueLoans.length, lang) })}
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
          checks={checks}
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
            checks={checks}
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
