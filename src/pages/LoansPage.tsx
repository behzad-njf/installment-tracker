import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Plus, Trash2, Upload } from 'lucide-react'

import { EmptyState } from '@/components/dashboard/EmptyState'
import { LoanTable } from '@/components/dashboard/LoanTable'
import { PayDialog } from '@/components/dashboard/PayDialog'
import { PaymentHistoryDialog } from '@/components/dashboard/PaymentHistoryDialog'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { AddEditLoanDialog } from '@/components/loans/AddEditLoanDialog'
import { DeleteLoanDialog } from '@/components/loans/DeleteLoanDialog'
import { Button } from '@/components/ui/button'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { currentMonthIndex } from '@/lib/jalali'
import { deadlineBuckets, remainingInstallments, summaryFor } from '@/lib/loans'
import { formatNumber } from '@/lib/money'
import { exportDataFile, importDataFile, loadData } from '@/lib/storage'
import type { Loan } from '@/lib/types'

export function LoansPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { loans, replaceData, clearAll } = useLoans()
  const month = useMemo(() => currentMonthIndex(), [])
  const summary = useMemo(() => summaryFor(loans, month), [loans, month])
  const nextSummary = useMemo(() => summaryFor(loans, month + 1), [loans, month])
  const deadlines = useMemo(() => deadlineBuckets(loans, month), [loans, month])

  const [tab, setTab] = useState<'open' | 'finished'>('open')
  const [addEditLoan, setAddEditLoan] = useState<{ loan: Loan | null; open: boolean }>(() => ({
    loan: null,
    open: new URLSearchParams(window.location.search).get('add') === '1',
  }))
  const [deleteLoan, setDeleteLoan] = useState<{ loan: Loan | null; open: boolean }>({
    loan: null,
    open: false,
  })
  const [payDialog, setPayDialog] = useState<{ id: string; month: number } | null>(null)
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PWA shortcut (?add=1) is consumed by the initial state above; clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('add')) return
    params.delete('add')
    const qs = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    )
  }, [])

  const filteredLoans = useMemo(() => {
    if (tab === 'finished') return loans.filter(l => remainingInstallments(l) === 0)
    return loans.filter(l => remainingInstallments(l) > 0)
  }, [loans, tab])

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
      const imported = importDataFile(reader.result as string)
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

  return (
    <div className="space-y-5">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">{t('nav.loans')}</h1>
      </div>

      <SummaryCards summary={summary} nextMonthAmount={nextSummary.totalMonthly} />

      {deadlines.upcoming.length > 0 && (
        <UpcomingDeadlines
          loans={deadlines.upcoming}
          month={month}
          onPay={loanId => setPayDialog({ id: loanId, month })}
        />
      )}

      {deadlines.overdue.length > 0 && (
        <div
          className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-300 text-sm"
          role="alert"
          aria-live="polite"
        >
          {t('dashboard.overdueLoans', { count: formatNumber(deadlines.overdue.length, lang) })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {importError && <span className="text-xs text-destructive">{importError}</span>}
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
        {loans.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(t('loans.clearAllConfirm'))) clearAll()
            }}
            aria-label={t('loans.clearAll')}
          >
            <Trash2 className="size-4" aria-hidden />
            <span className="hidden md:inline">{t('loans.clearAll')}</span>
          </Button>
        )}
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
