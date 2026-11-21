import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PersonAccountDialog } from '@/components/persons/PersonAccountDialog'
import { PersonAccountsTab } from '@/components/persons/PersonAccountsTab'
import { PersonDialog } from '@/components/persons/PersonDialog'
import { PersonTxnDialog } from '@/components/persons/PersonTxnDialog'
import { PersonTxnsTab } from '@/components/persons/PersonTxnsTab'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { navigate } from '@/hooks/useRoute'
import { formatMoney } from '@/lib/money'
import { personTotals } from '@/lib/persons'
import type { PersonAccount, PersonDraft, PersonTxn, PersonTxnDraft, PersonTxnKind } from '@/lib/types'

type Tab = 'info' | 'accounts' | 'payments' | 'receipts'
const TAB_KEYS: Record<Tab, string> = {
  info: 'persons.tabs.info',
  accounts: 'persons.tabs.accounts',
  payments: 'persons.tabs.payments',
  receipts: 'persons.tabs.receipts',
}

export function PersonDetailPage({ personId }: { personId: string }) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const {
    persons,
    personAccounts,
    personTxns,
    updatePerson,
    addPersonAccount,
    updatePersonAccount,
    removePersonAccount,
    addPersonTxn,
    updatePersonTxn,
    removePersonTxn,
  } = useLoans()

  const [tab, setTab] = useState<Tab>('info')
  const [editOpen, setEditOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<PersonAccount | null>(null)
  const [txnKind, setTxnKind] = useState<PersonTxnKind | null>(null)
  const [editingTxn, setEditingTxn] = useState<PersonTxn | undefined>(undefined)
  const [deleteAccount, setDeleteAccount] = useState<PersonAccount | null>(null)
  const [deleteTxn, setDeleteTxn] = useState<PersonTxn | null>(null)

  const person = persons.find(p => p.id === personId)
  if (!person) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('persons')}>
          <ArrowLeft className="size-4" aria-hidden /> {t('common.back')}
        </Button>
        <p className="text-muted-foreground text-sm">{t('persons.notFound')}</p>
      </div>
    )
  }

  const accounts = personAccounts.filter(a => a.personId === person.id)
  const txns = personTxns.filter(x => x.personId === person.id)
  const opening = person.openingBalance ?? 0
  const totals = personTotals(txns, opening)
  const balanceLabel =
    totals.balance > 0 ? t('persons.owesMe') : totals.balance < 0 ? t('persons.iOwe') : t('persons.settled')
  const roleLabel =
    opening > 0 ? t('persons.creditor') : opening < 0 ? t('persons.debtor') : t('persons.roleNone')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('persons')}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{person.name}</h1>
          {person.phone ? (
            <p className="text-muted-foreground text-xs" dir="ltr">
              {person.phone}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" aria-hidden /> {t('persons.edit')}
        </Button>
      </div>

      <div role="tablist" aria-label={t('persons.tabs.label')} className="flex overflow-x-auto border-b">
        {(Object.keys(TAB_KEYS) as Tab[]).map(key => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 whitespace-nowrap border-b-2 px-2 py-2 text-xs transition-colors sm:text-sm ${
              tab === key
                ? 'border-primary text-foreground font-semibold'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            {t(TAB_KEYS[key])}
          </button>
        ))}
      </div>

      {tab === 'info' ? (
        <dl className="divide-y rounded-xl border text-sm">
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.name')}</dt>
            <dd className="font-medium">{person.name}</dd>
          </div>
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.phone')}</dt>
            <dd dir="ltr">{person.phone ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.role')}</dt>
            <dd>{roleLabel}</dd>
          </div>
          {opening !== 0 ? (
            <div className="flex justify-between gap-3 p-3">
              <dt className="text-muted-foreground">{t('persons.openingAmount')}</dt>
              <dd className="tabular-nums">{formatMoney(Math.abs(opening), lang)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.note')}</dt>
            <dd className="max-w-[60%] text-end">{person.note ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.paymentsTotal')}</dt>
            <dd className="tabular-nums">{formatMoney(totals.payments, lang)}</dd>
          </div>
          <div className="flex justify-between gap-3 p-3">
            <dt className="text-muted-foreground">{t('persons.receiptsTotal')}</dt>
            <dd className="tabular-nums">{formatMoney(totals.receipts, lang)}</dd>
          </div>
          <div className="flex justify-between gap-3 p-3 font-semibold">
            <dt>{t('persons.balance')}</dt>
            <dd className="tabular-nums">
              {totals.balance === 0
                ? t('persons.settled')
                : `${formatMoney(Math.abs(totals.balance), lang)} · ${balanceLabel}`}
            </dd>
          </div>
        </dl>
      ) : null}

      {tab === 'accounts' ? (
        <PersonAccountsTab
          accounts={accounts}
          onAdd={() => {
            setEditingAccount(null)
            setAccountOpen(true)
          }}
          onEdit={account => {
            setEditingAccount(account)
            setAccountOpen(true)
          }}
          onRemove={setDeleteAccount}
        />
      ) : null}

      {tab === 'payments' ? (
        <PersonTxnsTab
          kind="payment"
          txns={txns.filter(x => x.kind === 'payment')}
          accounts={accounts}
          opening={opening}
          onAdd={() => setTxnKind('payment')}
          onRemove={setDeleteTxn}
          onEdit={setEditingTxn}
        />
      ) : null}

      {tab === 'receipts' ? (
        <PersonTxnsTab
          kind="receipt"
          txns={txns.filter(x => x.kind === 'receipt')}
          accounts={accounts}
          opening={opening}
          onAdd={() => setTxnKind('receipt')}
          onRemove={setDeleteTxn}
          onEdit={setEditingTxn}
        />
      ) : null}

      <PersonDialog
        key={person.id}
        person={person}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(draft: PersonDraft) => updatePerson(person.id, draft)}
      />
      <PersonAccountDialog
        key={editingAccount?.id ?? 'new-account'}
        account={editingAccount}
        personName={person.name}
        open={accountOpen}
        onOpenChange={open => {
          setAccountOpen(open)
          if (!open) setEditingAccount(null)
        }}
        onSave={draft =>
          editingAccount
            ? updatePersonAccount(editingAccount.id, draft)
            : addPersonAccount(person.id, draft)
        }
      />
      {txnKind || editingTxn ? (
        <PersonTxnDialog
          key={editingTxn?.id ?? txnKind ?? 'new'}
          kind={editingTxn?.kind ?? txnKind!}
          open
          onOpenChange={open => {
            if (!open) {
              setTxnKind(null)
              setEditingTxn(undefined)
            }
          }}
          accounts={accounts}
          txn={editingTxn}
          onSave={(draft: PersonTxnDraft) => {
            if (editingTxn) {
              updatePersonTxn(editingTxn.id, draft)
              setEditingTxn(undefined)
            } else {
              addPersonTxn(person.id, draft)
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleteAccount !== null}
        title={t('persons.deleteAccountTitle', { bank: deleteAccount?.bank ?? '' })}
        desc={t('persons.deleteAccountDesc')}
        onConfirm={() => {
          if (deleteAccount) removePersonAccount(deleteAccount.id)
          setDeleteAccount(null)
        }}
        onOpenChange={open => {
          if (!open) setDeleteAccount(null)
        }}
      />
      <ConfirmDialog
        open={deleteTxn !== null}
        title={t('persons.deleteTxnTitle')}
        desc={t('persons.deleteTxnDesc')}
        onConfirm={() => {
          if (deleteTxn) removePersonTxn(deleteTxn.id)
          setDeleteTxn(null)
        }}
        onOpenChange={open => {
          if (!open) setDeleteTxn(null)
        }}
      />
    </div>
  )
}
