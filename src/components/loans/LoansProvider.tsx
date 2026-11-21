import { createContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { importDataFile, loadData, newLoanId, saveData, STORAGE_KEY } from '@/lib/storage'
import { deleteAttachments, clearAttachments } from '@/lib/attachments'
import { canTransitionCheck, newCheckbook, newCheck, newCheckShell } from '@/lib/checks'
import { newPersonAccountId, newPersonId, newPersonTxnId } from '@/lib/persons'
import type {
  DataFile,
  Loan,
  LoanDraft,
  PaymentRecord,
  Check,
  Checkbook,
  CheckbookDraft,
  CheckDraft,
  CheckStatus,
  Person,
  PersonAccount,
  PersonAccountDraft,
  PersonDraft,
  PersonTxn,
  PersonTxnDraft,
} from '@/lib/types'

/** role + amount → signed opening balance; a half-filled pair means «no opening balance». */
function openingBalanceOf(draft: PersonDraft): number | undefined {
  if (!draft.role || !draft.openingAmount || draft.openingAmount <= 0) return undefined
  return draft.role === 'creditor' ? draft.openingAmount : -draft.openingAmount
}

function personFieldsOf(draft: PersonDraft): Omit<Person, 'id' | 'createdAt'> {
  return {
    name: draft.name,
    phone: draft.phone,
    nationalId: draft.nationalId,
    note: draft.note,
    openingBalance: openingBalanceOf(draft),
  }
}

export interface LoansContextValue {
  loans: Loan[]
  checkbooks: Checkbook[]
  checks: Check[]
  persons: Person[]
  personAccounts: PersonAccount[]
  personTxns: PersonTxn[]
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
  /** Move a check between lifecycle states; returns false when the move is not allowed. */
  setCheckStatus: (id: string, status: CheckStatus, patch?: Partial<Check>) => boolean
  removeCheck: (id: string) => void

  // Person CRUD
  addPerson: (draft: PersonDraft) => void
  updatePerson: (id: string, draft: PersonDraft) => void
  /** Removes the person together with their accounts and transactions. */
  removePerson: (id: string) => void
  addPersonAccount: (personId: string, draft: PersonAccountDraft) => void
  updatePersonAccount: (id: string, draft: PersonAccountDraft) => void
  removePersonAccount: (id: string) => void
  addPersonTxn: (personId: string, draft: PersonTxnDraft) => void
  updatePersonTxn: (id: string, draft: Partial<PersonTxn>) => void
  removePersonTxn: (id: string) => void
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
    void clearAttachments()
    persist({
      ...data,
      loans: [],
      checkbooks: [],
      checks: [],
      persons: [],
      personAccounts: [],
      personTxns: [],
    })
  }

  const addPerson = (draft: PersonDraft) => {
    const person: Person = { id: newPersonId(), createdAt: new Date().toISOString(), ...personFieldsOf(draft) }
    persist({ ...data, persons: [person, ...data.persons] })
  }

  const updatePerson = (id: string, draft: PersonDraft) => {
    persist({
      ...data,
      persons: data.persons.map(p => (p.id === id ? { ...p, ...personFieldsOf(draft) } : p)),
    })
  }

  /** Cascade delete: accounts and transactions of this person go too, or they'd dangle. */
  const removePerson = (id: string) => {
    const accounts = data.personAccounts.filter(a => a.personId === id).map(a => a.id)
    const removedTxns = data.personTxns.filter(t => t.personId === id || accounts.includes(t.accountId ?? ''))
    const attIds = removedTxns.flatMap(t => (t.attachments ?? []).map(a => a.id))
    if (attIds.length > 0) void deleteAttachments(attIds)
    persist({
      ...data,
      persons: data.persons.filter(p => p.id !== id),
      personAccounts: data.personAccounts.filter(a => a.personId !== id),
      personTxns: data.personTxns.filter(t => t.personId !== id && !accounts.includes(t.accountId ?? '')),
    })
  }

  const addPersonAccount = (personId: string, draft: PersonAccountDraft) => {
    const account: PersonAccount = { id: newPersonAccountId(), personId, ...draft }
    persist({ ...data, personAccounts: [...data.personAccounts, account] })
  }

  const updatePersonAccount = (id: string, draft: PersonAccountDraft) => {
    persist({
      ...data,
      personAccounts: data.personAccounts.map(a => (a.id === id ? { ...a, ...draft } : a)),
    })
  }

  const removePersonAccount = (id: string) => {
    persist({
      ...data,
      personAccounts: data.personAccounts.filter(a => a.id !== id),
      // Transactions survive; they just lose the account reference.
      personTxns: data.personTxns.map(t => (t.accountId === id ? { ...t, accountId: undefined } : t)),
    })
  }

  const addPersonTxn = (personId: string, draft: PersonTxnDraft) => {
    const txn: PersonTxn = { id: newPersonTxnId(), personId, createdAt: new Date().toISOString(), ...draft }
    persist({ ...data, personTxns: [...data.personTxns, txn] })
  }

  const removePersonTxn = (id: string) => {
    const txn = data.personTxns.find(t => t.id === id)
    if (txn?.attachments?.length) void deleteAttachments(txn.attachments.map(a => a.id))
    persist({ ...data, personTxns: data.personTxns.filter(t => t.id !== id) })
  }

  const updatePersonTxn = (id: string, draft: Partial<PersonTxn>) => {
    persist({
      ...data,
      personTxns: data.personTxns.map(t => (t.id === id ? { ...t, ...draft } : t)),
    })
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

  /** Bulk-create blank checks from `from` to `to`; skips serials already in the book. Returns created count. */
  const addChecksBulk = (bookId: string, from: number, to: number): number => {
    const book = data.checkbooks.find(c => c.id === bookId)
    if (!book) return 0
    const existing = new Set(
      data.checks.filter(c => c.checkbookId === bookId && c.serial !== undefined).map(c => c.serial),
    )
    const created: Check[] = []
    for (let serial = from; serial <= to && created.length < 500; serial += 1) {
      if (existing.has(serial)) continue
      created.push(newCheckShell(bookId, serial))
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

  /** Lifecycle move guarded by CHECK_STATUS_TRANSITIONS; issuing also needs payee, amount and purpose. */
  const setCheckStatus = (id: string, status: CheckStatus, patch: Partial<Check> = {}): boolean => {
    const check = data.checks.find(c => c.id === id)
    if (!check || !canTransitionCheck(check.status, status)) return false
    if (status === 'issued') {
      const payee = (patch.payee ?? check.payee).trim()
      const amount = patch.amount ?? check.amount
      const purpose = (patch.purpose ?? check.purpose ?? '').trim()
      if (!payee || !Number.isFinite(amount) || amount <= 0 || !purpose) return false
    }
    persist({
      ...data,
      checks: data.checks.map(c =>
        c.id === id ? { ...c, ...patch, status, updatedAt: new Date().toISOString() } : c,
      ),
    })
    return true
  }

  const replaceData = persist

  const value: LoansContextValue = {
    loans: data.loans,
    checkbooks: data.checkbooks,
    checks: data.checks,
    persons: data.persons,
    personAccounts: data.personAccounts,
    personTxns: data.personTxns,
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
    setCheckStatus,
    removeCheck,

    // Person CRUD
    addPerson,
    updatePerson,
    removePerson,
    addPersonAccount,
    updatePersonAccount,
    removePersonAccount,
    addPersonTxn,
    updatePersonTxn,
    removePersonTxn,
  }
  return (
    <LoansContext.Provider value={value}>{children}</LoansContext.Provider>
  )
}
