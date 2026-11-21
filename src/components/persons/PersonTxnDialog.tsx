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
import { parseMoney } from '@/lib/money'
import type { PersonAccount, PersonTxn, PersonTxnDraft, PersonTxnKind } from '@/lib/types'

const NO_ACCOUNT = 'none'

export function PersonTxnDialog({
  kind,
  open,
  onOpenChange,
  accounts,
  onSave,
  txn,
}: {
  kind: PersonTxnKind
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: PersonAccount[]
  onSave: (draft: PersonTxnDraft) => void
  txn?: PersonTxn
}) {
  const { t } = useTranslation()
  const cur = yearMonthOf(currentMonthIndex())
  const today = jalaliPartsFromDate(new Date())
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState(txn?.accountId ?? NO_ACCOUNT)
  const editing = !!txn

  const defaultTitle = txn?.title ?? ''
  const defaultAmount = txn?.amount ? String(txn.amount) : ''
  const defaultYear = txn ? String(txn.year) : String(cur.year)
  const defaultMonth = txn ? String(txn.month) : String(cur.month)
  const defaultDay = txn ? String(txn.day) : String(today.day)
  const defaultNote = txn?.note ?? ''

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const amount = parseMoney(field('amount'))
    const year = Number(field('year'))
    const month = Number(field('month'))
    const day = Number(field('day'))

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('persons.amountInvalid'))
      return
    }
    if (
      !Number.isInteger(year) ||
      year < 1300 ||
      year > 1500 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > daysInJalaliMonth(year, month)
    ) {
      setError(t('persons.dateInvalid'))
      return
    }
    setError('')
    onSave({
      kind,
      amount,
      year,
      month,
      day,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId,
      title: field('title') || undefined,
      note: field('note') || undefined,
    })
    setAccountId(txn?.accountId ?? NO_ACCOUNT)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('persons.editTxn') : kind === 'payment' ? t('persons.addPayment') : t('persons.addReceipt')}
            </DialogTitle>
          </DialogHeader>
          <Label htmlFor="txn-title">{t('persons.title')}</Label>
          <Input id="txn-title" name="title" defaultValue={defaultTitle} maxLength={80} autoFocus />
          <Label htmlFor="txn-amount">
            {t('persons.amount')} ({t('common.toman')})
          </Label>
          <Input id="txn-amount" name="amount" defaultValue={defaultAmount} inputMode="numeric" required />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="txn-year">{t('loans.year')}</Label>
              <Input id="txn-year" name="year" type="number" defaultValue={defaultYear} min={1300} max={1500} />
            </div>
            <div className="flex-1">
              <Label htmlFor="txn-month">{t('loans.month')}</Label>
              <Input id="txn-month" name="month" type="number" defaultValue={defaultMonth} min={1} max={12} />
            </div>
            <div className="flex-1">
              <Label htmlFor="txn-day">{t('common.day')}</Label>
              <Input id="txn-day" name="day" type="number" defaultValue={defaultDay} min={1} max={31} />
            </div>
          </div>
          {accounts.length > 0 ? (
            <>
              <Label htmlFor="txn-account">{t('persons.account')}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="txn-account" className="w-full" aria-label={t('persons.account')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT}>{t('persons.noAccount')}</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.holderName ? `${account.bank} (${account.holderName})` : account.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
          <Label htmlFor="txn-note">{t('persons.note')}</Label>
          <Input id="txn-note" name="note" defaultValue={defaultNote} maxLength={200} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{editing ? t('common.save') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
