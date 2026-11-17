import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Trash2, UsersRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PersonDialog } from '@/components/persons/PersonDialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { navigate } from '@/hooks/useRoute'
import { formatMoney } from '@/lib/money'
import { personTotals } from '@/lib/persons'
import type { Person, PersonDraft } from '@/lib/types'

export function PersonsPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { persons, personAccounts, personTxns, addPerson, updatePerson, removePerson } = useLoans()

  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)

  const q = query.trim()
  const visible = persons.filter(person =>
    q === '' ? true : person.name.includes(q) || (person.phone ?? '').includes(q),
  )

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditing(person)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('nav.persons')}</h1>
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden /> {t('persons.addPerson')}
        </Button>
      </div>

      {persons.length > 0 ? (
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('persons.search')}
            aria-label={t('persons.search')}
            className="ps-9"
          />
        </div>
      ) : null}

      {persons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <UsersRound className="text-muted-foreground size-8" aria-hidden />
          <p className="text-sm font-medium">{t('persons.emptyTitle')}</p>
          <p className="text-muted-foreground text-xs">{t('persons.emptyDesc')}</p>
          <Button type="button" size="sm" className="mt-2" onClick={openAdd}>
            <Plus className="size-4" aria-hidden /> {t('persons.addPerson')}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('persons.noResults')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map(person => {
            const txns = personTxns.filter(txn => txn.personId === person.id)
            const totals = personTotals(txns)
            const accountCount = personAccounts.filter(a => a.personId === person.id).length
            return (
              <li key={person.id} className="rounded-xl border p-3">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => navigate({ kind: 'persons.person', personId: person.id })}
                    className="min-w-0 flex-1 text-start"
                  >
                    <p className="truncate text-sm font-semibold">{person.name}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs" dir="ltr">
                      {person.phone ?? t('persons.noPhone')}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t('persons.summary', { accounts: accountCount, txns: txns.length })}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('persons.editAria', { name: person.name })}
                      onClick={() => openEdit(person)}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('persons.deleteAria', { name: person.name })}
                      onClick={() => setDeleting(person)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs">
                  <span className="text-muted-foreground">{t('persons.balance')}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      totals.balance > 0
                        ? 'text-green-700 dark:text-green-400'
                        : totals.balance < 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {totals.balance === 0
                      ? t('persons.settled')
                      : `${formatMoney(Math.abs(totals.balance), lang)} ${
                          totals.balance > 0 ? t('persons.owesMe') : t('persons.iOwe')
                        }`}
                  </span>
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <PersonDialog
        person={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(draft: PersonDraft) => {
          if (editing) updatePerson(editing.id, draft)
          else addPerson(draft)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={t('persons.deleteTitle', { name: deleting?.name ?? '' })}
        desc={t('persons.deleteDesc')}
        onConfirm={() => {
          if (deleting) removePerson(deleting.id)
          setDeleting(null)
        }}
        onOpenChange={open => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
