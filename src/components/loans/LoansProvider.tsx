import { createContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { importDataFile, loadData, newLoanId, saveData, STORAGE_KEY } from '@/lib/storage'
import { newCheckbook, newCheck, newCheckShell } from '@/lib/checks'
import { currentMonthIndex, jalaliPartsFromDate, yearMonthOf } from '@/lib/jalali'
import type { DataFile, Loan, LoanDraft, PaymentRecord, Check, Checkbook, CheckbookDraft, CheckDraft } from '@/lib/types'

export interface LoansContextValue {
  loans: Loan[]
  checkbooks: Checkbook[]
  checks: Check[]
  addLoan: (draft: LoanDraft) => void
  updateLoan: (id: string, draft: LoanDraft) => void
  removeLoan: (id: string) => void
  addPayment: (loanId: string, monthIndex: number, amount: number, paidAt: string) => void
  removePayment: (loanId: string, paymentId: string) => void
  clearAll: () => void
  replaceData: (data: DataFile) => void

  // Checkbook CRUD
  addCheckbook: (draft: CheckbookDraft) => void
  updateCheckbook: (id: string, draft: CheckbookDraft) => void
  removeCheckbook: (id: string) => void

  // Check CRUD
  addCheck: (draft: CheckDraft) => void
  addChecksBulk: (bookId: string, from: number, to: number) => number
  updateCheck: (id: string, draft: Partial<Check>) => void
  removeCheck: (id: string) => void
}

const LoansContext = createContext<LoansContextValue | null>(null)

export { LoansContext }

export function LoansProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataFile>(() => loadData())
  const { t } = useTranslation()

  /** Persist to localStorage and surface quota/private-mode failures to the user. */
  const persist = (next: DataFile) => {
    setData(next)
    if (!saveData(next)) toast.error(t('storage.saveFailed'))
  }

  // Cross-tab sync: a write in another tab reloads this tab's state.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      const next = importDataFile(event.newValue)
      if (next) setData(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addLoan = (draft: LoanDraft) => {
    const loan: Loan = {
      id: newLoanId(),
      createdAt: new Date().toISOString(),
      ...draft,
      payments: draft.payments ?? [],
    } as Loan
    const next = [loan, ...data.loans]
    persist({ ...data, loans: next })
  }

  const updateLoan = (id: string, draft: LoanDraft) => {
    const next = data.loans.map(l => (l.id === id ? { ...l, ...draft } : l))
    persist({ ...data, loans: next })
  }

  const removeLoan = (id: string) => {
    const next = data.loans.filter(l => l.id !== id)
    persist({ ...data, loans: next })
  }

  const addPayment = (loanId: string, monthIndex: number, amount: number, paidAt: string) => {
    const loan = data.loans.find(l => l.id === loanId)
    if (!loan) return
    const payment: PaymentRecord = {
      id: newLoanId(),
      monthIndex,
      amount,
      paidAt,
    }
    const nextLoans = data.loans.map(l =>
      l.id === loanId ? { ...l, payments: [...l.payments, payment] } : l,
    )
    persist({ ...data, loans: nextLoans })
  }

  const removePayment = (loanId: string, paymentId: string) => {
    const nextLoans = data.loans.map(l =>
      l.id === loanId
        ? { ...l, payments: l.payments.filter(p => p.id !== paymentId) }
        : l,
    )
    persist({ ...data, loans: nextLoans })
  }

  const clearAll = () => {
    persist({ ...data, loans: [], checkbooks: [], checks: [] })
  }

  /** Add a new checkbook */
  const addCheckbook = (draft: CheckbookDraft) => {
    const book = newCheckbook(draft)
    persist({ ...data, checkbooks: [...data.checkbooks, book] })
  }

  /** Update a checkbook (id/createdAt preserved) */
  const updateCheckbook = (id: string, draft: CheckbookDraft) => {
    persist({
      ...data,
      checkbooks: data.checkbooks.map(c =>
        c.id === id ? { ...c, ...draft } : c,
      ),
    })

  }

  /** Remove a checkbook (and any checks that reference it) */
  const removeCheckbook = (id: string) => {
    persist({
      ...data,
      checkbooks: data.checkbooks.filter(c => c.id !== id),
      checks: data.checks.filter(c => c.checkbookId !== id),
    })

  }

  /** Add a new check */
  const addCheck = (draft: CheckDraft) => {
    const book = data.checkbooks.find(c => c.id === draft.checkbookId)
    if (!book) return
    const check = newCheck({ ...draft, checkbookId: book.id })
    if (!check) return
    persist({
      ...data,
      checks: [...data.checks, check],
    })
  }

  /** Bulk-create serial-only shells from `from` to `to`; skips serials already in the book. Returns created count. */
  const addChecksBulk = (bookId: string, from: number, to: number): number => {
    const book = data.checkbooks.find(c => c.id === bookId)
    if (!book) return 0
    const existing = new Set(
      data.checks.filter(c => c.checkbookId === bookId && c.serial !== undefined).map(c => c.serial),
    )
    const { year, month } = yearMonthOf(currentMonthIndex())
    const { day } = jalaliPartsFromDate(new Date())
    const created: Check[] = []
    for (let serial = from; serial <= to && created.length < 500; serial += 1) {
      if (existing.has(serial)) continue
      created.push(newCheckShell(bookId, serial, year, month, day))
    }
    if (created.length === 0) return 0
    persist({ ...data, checks: [...data.checks, ...created] })
    return created.length
  }

  /** Update a check */
  const updateCheck = (id: string, draft: Partial<Check>) => {
    persist({
      ...data,
      checks: data.checks.map(c =>
        c.id === id ? { ...c, ...draft, updatedAt: new Date().toISOString() } : c,
      ),
    })
  }

  /** Remove a check */
  const removeCheck = (id: string) => {
    persist({ ...data, checks: data.checks.filter(c => c.id !== id) })
  }

  const replaceData = persist

  const value: LoansContextValue = {
    loans: data.loans,
    checkbooks: data.checkbooks,
    checks: data.checks,
    addLoan,
    updateLoan,
    removeLoan,
    addPayment,
    removePayment,
    clearAll,
    replaceData,

    // Checkbook CRUD
    addCheckbook,
    updateCheckbook,
    removeCheckbook,

    // Check CRUD
    addCheck,
    addChecksBulk,
    updateCheck,
    removeCheck,
  }
  return (
    <LoansContext.Provider value={value}>{children}</LoansContext.Provider>
  )
}
