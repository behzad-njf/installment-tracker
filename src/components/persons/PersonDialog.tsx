import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
          <Select value={role} onValueChange={value => setRole(value as RoleValue)}>
            <SelectTrigger id="person-role" className="w-full" aria-label={t('persons.role')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ROLE}>{t('persons.roleNone')}</SelectItem>
              <SelectItem value="creditor">{t('persons.creditor')}</SelectItem>
              <SelectItem value="debtor">{t('persons.debtor')}</SelectItem>
            </SelectContent>
          </Select>
          {role === NO_ROLE ? null : (
            <>
              <Label htmlFor="person-opening">
                {t('persons.openingAmount')} ({t('common.toman')})
              </Label>
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
