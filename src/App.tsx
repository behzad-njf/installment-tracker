import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AddEditLoanDialog } from '@/components/loans/AddEditLoanDialog'
import { DeleteLoanDialog } from '@/components/loans/DeleteLoanDialog'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { BreakdownChart } from '@/components/dashboard/BreakdownChart'
import { YearCalendar } from '@/components/dashboard/YearCalendar'
import { LoanTable } from '@/components/dashboard/LoanTable'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { PayDialog } from '@/components/dashboard/PayDialog'
import { PaymentHistoryDialog } from '@/components/dashboard/PaymentHistoryDialog'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Plus, BarChart2, Calendar, Upload } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { useLoans } from '@/hooks/useLoans'
import { currentMonthIndex, todayLabel, yearMonthOf } from '@/lib/jalali'
import { daysUntilLoanDeadline, remainingInstallments, summaryFor } from '@/lib/loans'
import { exportDataFile, importDataFile, loadData } from '@/lib/storage'
import type { Loan } from '@/lib/types'

interface PayContext {
  id: string
  month: number
}

export function App() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { loans, replaceData } = useLoans()
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

  const [addEditLoan, setAddEditLoan] = useState<{ loan: Loan | null; open: boolean }>({ loan: null, open: false })
  const [deleteLoan, setDeleteLoan] = useState<{ loan: Loan | null; open: boolean }>({ loan: null, open: false })
  const [payDialog, setPayDialog] = useState<PayContext | null>(null)
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null)
  const [tab, setTab] = useState<'open' | 'finished'>('open')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = () => {
    const data = loadData()
    const json = exportDataFile(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const imported = importDataFile(text)
      if (!imported) {
        setImportError(t('backup.invalidFile'))
        return
      }
      setImportError(null)
      replaceData(imported)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const filteredLoans = useMemo(() => {
    if (tab === 'finished') {
      return loans.filter(l => remainingInstallments(l) === 0)
    }
    return loans.filter(l => remainingInstallments(l) > 0)
  }, [loans, tab])


  return (
    <AppShell>
      <div className="space-y-5">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.overview')}</h1>
          <p className="text-muted-foreground text-xs sm:hidden">
            {todayLabel(lang)}
          </p>
        </div>

        <SummaryCards summary={summary} nextMonthAmount={nextSummary.totalMonthly} />
        {upcomingDeadlines.length > 0 && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm"
            role="alert"
            aria-live="polite"
          >
            {t('dashboard.upcomingDeadlines', { count: upcomingDeadlines.length })}
          </div>
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
        {/* Desktop: both chart and calendar side by side */}
        <div className="hidden md:grid md:grid-cols-2 gap-3">
          <Card>
            <CardContent>
              <BreakdownChart loans={loans} year={chartYear} />
            </CardContent>
          </Card>
          <YearCalendar loans={loans} year={calYear} onYearChange={setCalYear} />
        </div>

        {/* Mobile: tabs with calendar as default */}
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
            <YearCalendar loans={loans} year={calYear} onYearChange={setCalYear} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {importError && (
            <span className="text-xs text-destructive">{importError}</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExport}
            aria-label={t('backup.export')}
          >
            <Download className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('backup.import')}
          >
            <Upload className="size-4" aria-hidden />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImportFile}
            aria-label={t('backup.importLabel')}
          />
          <Button
            type="button"
            size="sm"
            variant={tab === 'open' ? 'default' : 'outline'}
            onClick={() => setTab('open')}
          >
            <span className="md:hidden">{t('tabs.openShort')}</span>
            <span className="hidden md:inline">{t('tabs.open')}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'finished' ? 'default' : 'outline'}
            onClick={() => setTab('finished')}
          >
            <span className="md:hidden">{t('tabs.finishedShort')}</span>
            <span className="hidden md:inline">{t('tabs.finished')}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="ms-auto"
            aria-label={t('loans.add')}
            onClick={() => setAddEditLoan({ loan: null, open: true })}
          >
            <Plus className="size-4 ms-1.5" aria-hidden />
            <span className="hidden md:inline">{t('loans.add')}</span>
          </Button>
        </div>

        {loans.length === 0 ? (
          <EmptyState />
        ) : filteredLoans.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t('tabs.empty')}</p>
        ) : (
          <LoanTable
            month={month}
            loans={filteredLoans}
            onPay={(id, m) => setPayDialog({ id, month: m })}
            onEdit={loan => setAddEditLoan({ loan, open: true })}
            onDelete={loan => setDeleteLoan({ loan, open: true })}
            onHistory={loan => setHistoryLoan(loan)}
          />
        )}

        {addEditLoan.open && (
          <AddEditLoanDialog
            loan={addEditLoan.loan}
            open
            onOpenChange={open => setAddEditLoan(prev => ({ ...prev, open }))}
          />
        )}
        <DeleteLoanDialog
          loan={deleteLoan.loan}
          open={deleteLoan.open}
          onOpenChange={open => setDeleteLoan(prev => ({ ...prev, open }))}
        />
        <PayDialog
          key={payDialog?.month ?? 0}
          loan={loans.find(l => l.id === payDialog?.id) ?? null}
          monthIndex={payDialog?.month ?? 0}
          open={payDialog !== null}
          onOpenChange={open => { if (!open) setPayDialog(null) }}
        />
        <PaymentHistoryDialog
          loan={historyLoan}
          open={historyLoan !== null}
          onOpenChange={open => { if (!open) setHistoryLoan(null) }}
        />
      </div>
    </AppShell>
  )
}
