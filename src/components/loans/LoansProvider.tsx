import { createContext, useState, type ReactNode } from 'react'
import { loadData, newLoanId, saveData } from '@/lib/storage'
import type { DataFile, Loan, LoanDraft, PaymentRecord } from '@/lib/types'

export interface LoansContextValue {
  loans: Loan[]
  addLoan: (draft: LoanDraft) => void
  updateLoan: (id: string, draft: LoanDraft) => void
  removeLoan: (id: string) => void
  addPayment: (loanId: string, monthIndex: number, amount: number, paidAt: string) => void
  removePayment: (loanId: string, paymentId: string) => void
  clearDemo: () => void
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

  const value: LoansContextValue = {
    loans: data.loans,
    addLoan,
    updateLoan,
    removeLoan,
    addPayment,
    removePayment,
    clearDemo,
  }
  return (
    <LoansContext.Provider value={value}>{children}</LoansContext.Provider>
  )
}
