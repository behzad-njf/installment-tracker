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
import { currentMonthIndex, daysInJalaliMonth, jalaliPartsFromDate, yearMonthOf } from '@/lib/jalali'
import type { Check, CheckDraft, CheckStatus } from '@/lib/types'

/**
 * Define/edit a check. A blank check carries only its serial; an issued one
 * needs payee, amount, purpose and due date. Status itself never moves here —
 * that is the status dialog's job.
 */
export function CheckDialog({
  bookId,
  check,
  suggestedSerial,
  usedSerials,
  open,
  onOpenChange,
  onSave,
}: {
  bookId: string
  check: Check | null
  suggestedSerial: number
  usedSerials: number[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: CheckDraft) => void
}) {
  const { t } = useTranslation()
  const cur = yearMonthOf(currentMonthIndex())
  const today = jalaliPartsFromDate(new Date())
  const [error, setError] = useState('')
  const [newStatus, setNewStatus] = useState<CheckStatus>('blank')

  const issued = check ? check.status !== 'blank' : newStatus === 'issued'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const serialRaw = Number(field('serial'))
    const note = field('note')

    if (!Number.isInteger(serialRaw) || serialRaw < 1 || serialRaw > 9_999_999) {
      setError(t('checks.serialInvalid'))
      return
    }
    if (serialRaw !== check?.serial && usedSerials.includes(serialRaw)) {
      setError(t('checks.serialDuplicate'))
      return
    }
    if (!issued) {
      setError('')
      onSave({ checkbookId: bookId, serial: serialRaw, payee: '', amount: 0, note, status: 'blank' })
      onOpenChange(false)
      return
    }

    const payee = field('payee')
    const amount = Number(field('amount'))
    const purpose = field('purpose')
    const dueYear = Number(field('year'))
    const dueMonth = Number(field('month'))
    const dueDay = Number(field('day'))

    if (!payee || !Number.isFinite(amount) || amount <= 0) {
      setError(t('checks.payeeAmountRequired'))
      return
    }
    if (!purpose) {
      setError(t('checks.purposeRequired'))
      return
    }
    if (!Number.isInteger(dueYear) || dueYear < 1300 || dueYear > 1500) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > daysInJalaliMonth(dueYear, dueMonth)) {
      setError(t('checks.dueInvalid'))
      return
    }

    setError('')
    onSave({
      checkbookId: bookId,
      serial: serialRaw,
      payee,
      amount,
      purpose,
      dueYear,
      dueMonth,
      dueDay,
      note,
      status: check?.status ?? 'issued',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{check ? t('checks.editCheck') : t('checks.addCheck')}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="check-serial">{t('checks.serial')}</Label>
          <Input
            id="check-serial"
            name="serial"
            type="number"
            inputMode="numeric"
            min={1}
            max={9_999_999}
            defaultValue={check?.serial !== undefined ? String(check.serial) : String(suggestedSerial)}
          />
          {check === null ? (
            <>
              <Label htmlFor="check-kind">{t('checks.defineAs')}</Label>
              <Select value={newStatus} onValueChange={value => setNewStatus(value as CheckStatus)}>
                <SelectTrigger id="check-kind" className="w-full" aria-label={t('checks.defineAs')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">{t('checks.status.blank')}</SelectItem>
                  <SelectItem value="issued">{t('checks.status.issued')}</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null}
          {!issued ? (
            <p className="text-sm text-muted-foreground">{t('checks.blankHint')}</p>
          ) : (
            <>
              <Label htmlFor="check-payee">{t('checks.payee')}</Label>
              <Input id="check-payee" name="payee" defaultValue={check?.payee ?? ''} maxLength={80} />
              <Label htmlFor="check-amount">{t('checks.amount')} ({t('common.toman')})</Label>
              <Input
                id="check-amount"
                name="amount"
                type="text"
                inputMode="numeric"
                defaultValue={check && check.amount > 0 ? String(check.amount) : ''}
              />
              <Label htmlFor="check-purpose">{t('checks.purpose')}</Label>
              <Input id="check-purpose" name="purpose" defaultValue={check?.purpose ?? ''} maxLength={120} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="check-year">{t('loans.year')}</Label>
                  <Input id="check-year" name="year" type="number" defaultValue={String(check?.dueYear ?? cur.year)} min={1300} max={1500} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="check-month">{t('loans.month')}</Label>
                  <Input id="check-month" name="month" type="number" defaultValue={String(check?.dueMonth ?? cur.month)} min={1} max={12} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="check-day">{t('common.day')}</Label>
                  <Input id="check-day" name="day" type="number" defaultValue={String(check?.dueDay ?? today.day)} min={1} max={31} />
                </div>
              </div>
            </>
          )}
          <Label htmlFor="check-note">{t('checks.note')}</Label>
          <Input id="check-note" name="note" defaultValue={check?.note ?? ''} maxLength={200} />
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
