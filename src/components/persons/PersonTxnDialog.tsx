import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X } from 'lucide-react'

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
import { deleteAttachment, getAttachment, putAttachment } from '@/lib/attachments'
import { currentMonthIndex, daysInJalaliMonth, jalaliPartsFromDate, yearMonthOf } from '@/lib/jalali'
import { parseMoney } from '@/lib/money'
import { MAX_ATTACHMENTS, newAttachmentId } from '@/lib/persons'
import type { Attachment, PersonAccount, PersonTxn, PersonTxnDraft, PersonTxnKind } from '@/lib/types'

const NO_ACCOUNT = 'none'

interface Item {
  att: Attachment
  /** Present for files picked in this dialog; written to IndexedDB only on save. */
  file?: File
  url: string
}

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
  const [items, setItems] = useState<Item[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  const editing = !!txn

  const defaultTitle = txn?.title ?? ''
  const defaultAmount = txn?.amount ? String(txn.amount) : ''
  const defaultYear = txn ? String(txn.year) : String(cur.year)
  const defaultMonth = txn ? String(txn.month) : String(cur.month)
  const defaultDay = txn ? String(txn.day) : String(today.day)
  const defaultNote = txn?.note ?? ''

  // Load existing attachment blobs for preview when editing.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      const loaded: Item[] = []
      for (const att of txn?.attachments ?? []) {
        const blob = await getAttachment(att.id)
        if (cancelled) return
        const url = blob ? URL.createObjectURL(blob) : ''
        if (url) urls.current.push(url)
        loaded.push({ att, url })
      }
      if (!cancelled) setItems(loaded)
    })()
    return () => {
      cancelled = true
    }
  }, [open, txn])

  // Revoke every object URL when the dialog unmounts.
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), [])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const room = MAX_ATTACHMENTS - items.length
    const picked = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, Math.max(room, 0))
    if (picked.length === 0) return
    const next = picked.map<Item>(file => {
      const url = URL.createObjectURL(file)
      urls.current.push(url)
      return {
        att: { id: newAttachmentId(), name: file.name || 'image', type: file.type, size: file.size },
        file,
        url,
      }
    })
    setItems(prev => [...prev, ...next])
  }

  const removeAt = (index: number) => {
    setItems(prev => {
      const target = prev[index]
      if (target?.url) URL.revokeObjectURL(target.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    // Write newly picked blobs, then drop blobs of attachments removed from this txn.
    for (const item of items) {
      if (item.file) await putAttachment(item.att.id, item.file)
    }
    const kept = new Set(items.map(item => item.att.id))
    for (const att of txn?.attachments ?? []) {
      if (!kept.has(att.id)) await deleteAttachment(att.id)
    }

    onSave({
      kind,
      amount,
      year,
      month,
      day,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId,
      title: field('title') || undefined,
      note: field('note') || undefined,
      attachments: items.length > 0 ? items.map(item => item.att) : undefined,
    })
    setAccountId(txn?.accountId ?? NO_ACCOUNT)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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

          <div className="space-y-2 border-t border-dashed pt-3">
            <Label>{t('persons.attachments')}</Label>
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
                  <div
                    key={item.att.id}
                    className="bg-muted relative size-20 overflow-hidden rounded-lg border"
                  >
                    {item.url ? (
                      <img src={item.url} alt={item.att.name} className="size-full object-cover" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      aria-label={t('persons.removeAttachmentAria', { name: item.att.name })}
                      className="absolute top-1 end-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {items.length < MAX_ATTACHMENTS ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="text-muted-foreground bg-muted hover:bg-muted/70 flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-4 text-xs"
                >
                  <ImagePlus className="text-primary size-5" aria-hidden />
                  <span>{t('persons.addAttachment')}</span>
                  <span className="opacity-70">{t('persons.attachmentHint')}</span>
                </button>
              </>
            ) : null}
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button type="submit">{t('common.save')}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
