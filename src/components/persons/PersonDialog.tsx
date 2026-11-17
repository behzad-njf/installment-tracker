import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingDown, TrendingUp, CircleSlash } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLocale } from '@/hooks/useLocale'
import { formatMoney, parseMoney } from '@/lib/money'
import type { Person, PersonDraft, PersonRole } from '@/lib/types'

const NO_ROLE = 'none'
type RoleValue = PersonRole | typeof NO_ROLE

export function PersonDialog({
  person,
  open,
  onOpenChange,
  onSave,
}: {
  person: Person | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: PersonDraft) => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const [role, setRole] = useState<RoleValue>((): RoleValue =>
    person?.openingBalance ? (person.openingBalance > 0 ? 'creditor' : 'debtor') : NO_ROLE,
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const name = field('name')
    if (!name) {
      setError(t('persons.nameRequired'))
      return
    }
    const openingAmount = role === NO_ROLE ? undefined : parseMoney(field('amount'))
    if (role !== NO_ROLE && (!openingAmount || openingAmount <= 0)) {
      setError(t('persons.openingAmountInvalid'))
      return
    }
    setError('')
    onSave({
      name,
      phone: field('phone') || undefined,
      note: field('note') || undefined,
      role: role === NO_ROLE ? undefined : role,
      openingAmount,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{person ? t('persons.editPerson') : t('persons.addPerson')}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="person-name">{t('persons.name')}</Label>
          <Input id="person-name" name="name" defaultValue={person?.name ?? ''} maxLength={60} autoFocus />
          <Label htmlFor="person-phone">{t('persons.phone')}</Label>
          <Input
            id="person-phone"
            name="phone"
            inputMode="tel"
            dir="ltr"
            defaultValue={person?.phone ?? ''}
            maxLength={20}
          />
          <Label htmlFor="person-role">{t('persons.role')}</Label>
          <div className="flex gap-2" role="group" aria-label={t('persons.role')}>
            <Button
              type="button"
              variant={role === NO_ROLE ? 'default' : 'outline'}
              className="flex-1"
              aria-label={t('persons.roleNone')}
              onClick={() => setRole(NO_ROLE)}
            >
              <CircleSlash className="size-4" aria-hidden /> {t('persons.roleNone')}
            </Button>
            <Button
              type="button"
              variant={role === 'creditor' ? 'default' : 'outline'}
              className="flex-1"
              aria-label={t('persons.creditor')}
              onClick={() => setRole('creditor')}
            >
              <TrendingUp className="size-4" aria-hidden /> {t('persons.creditor')}
            </Button>
            <Button
              type="button"
              variant={role === 'debtor' ? 'default' : 'outline'}
              className="flex-1"
              aria-label={t('persons.debtor')}
              onClick={() => setRole('debtor')}
            >
              <TrendingDown className="size-4" aria-hidden /> {t('persons.debtor')}
            </Button>
          </div>
          {role === NO_ROLE ? null : (
            <>
              <Label htmlFor="person-opening">{t('persons.openingAmount')} ({t('common.toman')})</Label>
              <Input
                id="person-opening"
                name="amount"
                inputMode="numeric"
                defaultValue={
                  person?.openingBalance ? formatMoney(Math.abs(person.openingBalance), lang) : ''
                }
                placeholder={formatMoney(1_000_000, lang)}
              />
            </>
          )}
          <Label htmlFor="person-note">{t('persons.note')}</Label>
          <Input id="person-note" name="note" defaultValue={person?.note ?? ''} maxLength={200} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}