import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Checkbook } from '@/lib/types'

const SERIAL_MAX = 9_999_999
const BULK_LIMIT = 500

function parseSerial(value: string): number | null {
  const n = Number(value.trim())
  return Number.isInteger(n) && n >= 1 && n <= SERIAL_MAX ? n : null
}

export function BulkChecksDialog({
  book,
  open,
  onOpenChange,
  onSave,
}: {
  book: Checkbook
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (from: number, to: number) => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const from = parseSerial(field('from'))
    const to = parseSerial(field('to'))
    if (from === null || to === null || to < from) {
      setError(t('checks.rangeInvalid'))
      return
    }
    if (to - from + 1 > BULK_LIMIT) {
      setError(t('checks.bulkTooMany', { limit: BULK_LIMIT }))
      return
    }
    setError('')
    onSave(from, to)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{t('checks.bulkTitle')}</DialogTitle>
            <DialogDescription>{t('checks.bulkDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="bulk-from">{t('checks.serialFrom')}</Label>
              <Input
                id="bulk-from"
                name="from"
                type="number"
                inputMode="numeric"
                min={1}
                max={SERIAL_MAX}
                defaultValue={book.serialFrom !== undefined ? String(book.serialFrom) : ''}
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="bulk-to">{t('checks.serialTo')}</Label>
              <Input
                id="bulk-to"
                name="to"
                type="number"
                inputMode="numeric"
                min={1}
                max={SERIAL_MAX}
                defaultValue={book.serialTo !== undefined ? String(book.serialTo) : ''}
                required
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
