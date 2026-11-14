import { createContext, useState, type ReactNode } from 'react'
import { loadData, newLoanId, saveData } from '@/lib/storage'
import { newCheckbook, newCheck } from '@/lib/checks'
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
  clearDemo: () => void
  replaceData: (data: DataFile) => void

  // Checkbook CRUD
  addCheckbook: (draft: CheckbookDraft) => void
  updateCheckbook: (id: string, draft: CheckbookDraft) => void
  removeCheckbook: (id: string) => void

  // Check CRUD
  addCheck: (draft: CheckDraft) => void
  updateCheck: (id: string, draft: Partial<Check>) => void
  removeCheck: (id: string) => void
}

const LoansContext = createContext<LoansContextValue | null>(null)

export { LoansContext }

export function LoansProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataFile>(() => loadData())

  const addLoan = (draft: LoanDraft) => {
    const loan: Loan = {
      id: newLoanId(),
      createdAt: new Date().toISOString(),
      ...draft,
      payments: draft.payments ?? [],
    } as Loan
    const next = [loan, ...data.loans]
    setData({ ...data, loans: next })
    saveData({ ...data, loans: next })
  }

  const updateLoan = (id: string, draft: LoanDraft) => {
    const next = data.loans.map(l => (l.id === id ? { ...l, ...draft } : l))
    setData({ ...data, loans: next })
    saveData({ ...data, loans: next })
  }

  const removeLoan = (id: string) => {
    const next = data.loans.filter(l => l.id !== id)
    setData({ ...data, loans: next })
    saveData({ ...data, loans: next })
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
    setData({ ...data, loans: nextLoans })
    saveData({ ...data, loans: nextLoans })
  }

  const removePayment = (loanId: string, paymentId: string) => {
    const nextLoans = data.loans.map(l =>
      l.id === loanId
        ? { ...l, payments: l.payments.filter(p => p.id !== paymentId) }
        : l,
    )
    setData({ ...data, loans: nextLoans })
    saveData({ ...data, loans: nextLoans })
  }

  const clearDemo = () => {
    const next = { ...data, loans: [] }
    setData(next)
    saveData(next)
  }

  /** Add a new checkbook */
  const addCheckbook = (draft: CheckbookDraft) => {
    const book = newCheckbook(draft)
    setData({ ...data, checkbooks: [...data.checkbooks, book] })
    saveData({ ...data, checkbooks: [...data.checkbooks, book] })
  }

  /** Update a checkbook */
  const updateCheckbook = (id: string, draft: CheckbookDraft) => {
    setData({
      ...data,
      checkbooks: data.checkbooks.map(c =>
        c.id === id ? { ...c, ...newCheckbook(draft) } : c,
      ),
    })
    saveData({ ...data, checkbooks: data.checkbooks.map(c =>
      c.id === id ? { ...c, ...newCheckbook(draft) } : c,
    ) })
  }

  /** Remove a checkbook (and any checks that reference it) */
  const removeCheckbook = (id: string) => {
    setData({
      ...data,
      checkbooks: data.checkbooks.filter(c => c.id !== id),
      checks: data.checks.filter(c => c.checkbookId !== id),
    })
    saveData({
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
    setData({
      ...data,
      checks: [...data.checks, check],
    })
    saveData({
      ...data,
      checks: [...data.checks, check],
    })
  }

  /** Update a check */
  const updateCheck = (id: string, draft: Partial<Check>) => {
    setData({
      ...data,
      checks: data.checks.map(c =>
        c.id === id ? { ...c, ...draft, updatedAt: new Date().toISOString() } : c,
      ),
    })
    saveData({
      ...data,
      checks: data.checks.map(c =>
        c.id === id ? { ...c, ...draft, updatedAt: new Date().toISOString() } : c,
      ),
    })
  }

  /** Remove a check */
  const removeCheck = (id: string) => {
    setData({
      ...data,
      checks: data.checks.filter(c => c.id !== id),
    })
    saveData({
      ...data,
      checks: data.checks.filter(c => c.id !== id),
    })
  }

  const replaceData = (next: DataFile) => {
    setData(next)
    saveData(next)
  }

  const value: LoansContextValue = {
    loans: data.loans,
    checkbooks: data.checkbooks,
    checks: data.checks,
    addLoan,
    updateLoan,
    removeLoan,
    addPayment,
    removePayment,
    clearDemo,
    replaceData,

    // Checkbook CRUD
    addCheckbook,
    updateCheckbook,
    removeCheckbook,

    // Check CRUD
    addCheck,
    updateCheck,
    removeCheck,
  }
  return (
    <LoansContext.Provider value={value}>{children}</LoansContext.Provider>
  )
}
