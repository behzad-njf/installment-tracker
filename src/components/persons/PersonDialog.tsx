import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import type { Person, PersonDraft } from '@/lib/types'

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
    setError('')
    onSave({
      name,
      phone: field('phone') || undefined,
      nationalId: field('nationalId') || undefined,
      note: field('note') || undefined,
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
          <Label htmlFor="person-national">{t('persons.nationalId')}</Label>
          <Input
            id="person-national"
            name="nationalId"
            inputMode="numeric"
            dir="ltr"
            defaultValue={person?.nationalId ?? ''}
            maxLength={10}
          />
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
