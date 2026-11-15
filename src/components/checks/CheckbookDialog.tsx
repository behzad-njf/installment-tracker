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
import type { Checkbook, CheckbookDraft } from '@/lib/types'

const SERIAL_MAX = 9_999_999

function parseSerial(value: string): number | null {
  const n = Number(value.trim())
  return Number.isInteger(n) && n >= 1 && n <= SERIAL_MAX ? n : null
}

export function CheckbookDialog({
  book,
  open,
  onOpenChange,
  onSave,
}: {
  book: Checkbook | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: CheckbookDraft) => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const name = field('name')
    const bank = field('bank')
    const accountNumber = field('accountNumber')
    const serialFrom = parseSerial(field('serialFrom'))
    const serialTo = parseSerial(field('serialTo'))

    if (!name) {
      setError(t('checks.nameRequired'))
      return
    }
    if (!accountNumber) {
      setError(t('checks.accountRequired'))
      return
    }
    if (serialFrom === null || serialTo === null || serialTo < serialFrom) {
      setError(t('checks.rangeInvalid'))
      return
    }
    setError('')
    onSave({ name, bank, accountNumber, serialFrom, serialTo })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{book ? t('checks.editCheckbook') : t('checks.addCheckbook')}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="checkbook-name">{t('checks.checkbookName')}</Label>
          <Input id="checkbook-name" name="name" defaultValue={book?.name ?? ''} maxLength={80} />
          <Label htmlFor="checkbook-bank">{t('checks.bank')}</Label>
          <Input id="checkbook-bank" name="bank" defaultValue={book?.bank ?? ''} maxLength={60} />
          <Label htmlFor="checkbook-account">{t('checks.accountNumber')}</Label>
          <Input
            id="checkbook-account"
            name="accountNumber"
            inputMode="numeric"
            defaultValue={book?.accountNumber ?? ''}
            maxLength={40}
          />
          <p className="text-sm font-medium">{t('checks.serialRange')}</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="checkbook-from">{t('checks.serialFrom')}</Label>
              <Input
                id="checkbook-from"
                name="serialFrom"
                type="number"
                inputMode="numeric"
                min={1}
                max={SERIAL_MAX}
                defaultValue={book?.serialFrom !== undefined ? String(book.serialFrom) : ''}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="checkbook-to">{t('checks.serialTo')}</Label>
              <Input
                id="checkbook-to"
                name="serialTo"
                type="number"
                inputMode="numeric"
                min={1}
                max={SERIAL_MAX}
                defaultValue={book?.serialTo !== undefined ? String(book.serialTo) : ''}
              />
            </div>
          </div>
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
