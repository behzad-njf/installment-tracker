import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Edit3, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { currentMonthIndex, monthIndexFrom, yearMonthOf, daysInJalaliMonth } from '@/lib/jalali'
import { formatMoney } from '@/lib/money'
import { checkSummary } from '@/lib/checks'
import type { Check, Checkbook, CheckbookDraft, CheckDraft, CheckStatus } from '@/lib/types'

function ConfirmDialog({
  open,
  title,
  desc,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  title: string
  desc: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckbookDialog({
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement | null)?.value.trim() ?? ''
    const bank = (form.elements.namedItem('bank') as HTMLInputElement | null)?.value.trim() ?? ''
    if (!name) return
    onSave({ name, bank })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{book ? t('checks.editCheckbook') : t('checks.addCheckbook')}</DialogTitle>
          </DialogHeader>
          <Label>{t('checks.checkbookName')}</Label>
          <Input name="name" defaultValue={book?.name ?? ''} onChange={() => {}} maxLength={80} required />
          <Label>{t('checks.bank')}</Label>
          <Input name="bank" defaultValue={book?.bank ?? ''} onChange={() => {}} maxLength={80} />
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

function CheckDialog({
  bookId,
  check,
  open,
  onOpenChange,
  onSave,
}: {
  bookId: string
  check: Check | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: CheckDraft) => void
}) {
  const { t } = useTranslation()
  const cur = yearMonthOf(currentMonthIndex())

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const payee = (form.elements.namedItem('payee') as HTMLInputElement | null)?.value.trim() ?? ''
    const amount = Number((form.elements.namedItem('amount') as HTMLInputElement | null)?.value ?? '')
    const dueYear = Number((form.elements.namedItem('year') as HTMLInputElement | null)?.value ?? '')
    const dueMonth = Number((form.elements.namedItem('month') as HTMLInputElement | null)?.value ?? '')
    const dueDay = Number((form.elements.namedItem('day') as HTMLInputElement | null)?.value ?? '')
    const note = (form.elements.namedItem('note') as HTMLInputElement | null)?.value.trim() ?? ''
    const status = (form.elements.namedItem('status') as HTMLSelectElement | null)?.value as CheckStatus | undefined

    if (!payee || !Number.isFinite(amount) || amount <= 0) return
    if (!Number.isInteger(dueYear) || dueYear < 1300 || dueYear > 1500) return
    if (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12) return
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > daysInJalaliMonth(dueYear, dueMonth)) return

    onSave({ checkbookId: bookId, payee, amount, dueYear, dueMonth, dueDay, note, status })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{check ? t('checks.editCheck') : t('checks.addCheck')}</DialogTitle>
            {check ? <DialogDescription>{check.payee}</DialogDescription> : null}
          </DialogHeader>
          <Label>{t('checks.payee')}</Label>
          <Input name="payee" defaultValue={check?.payee ?? ''} maxLength={80} required />
          <Label>{t('checks.amount')} ({t('common.toman')})</Label>
          <Input name="amount" type="text" defaultValue={check ? String(check.amount) : ''} required />
          <div className="flex gap-2">
            <div>
              <Label>{t('loans.year')}</Label>
              <Input name="year" type="number" defaultValue={String(check?.dueYear ?? cur.year)} min={1300} max={1500} required />
            </div>
            <div>
              <Label>{t('loans.month')}</Label>
              <Input name="month" type="number" defaultValue={String(check?.dueMonth ?? cur.month)} min={1} max={12} required />
            </div>
            <div>
              <Label>{t('common.day')}</Label>
              <Input name="day" type="number" defaultValue={String(check?.dueDay ?? 1)} min={1} max={31} required />
            </div>
          </div>
          <Label>{t('checks.note')}</Label>
          <Input name="note" defaultValue={check?.note ?? ''} maxLength={200} />
          <Label>{t('checks.statusLabel')}</Label>
          <Select name="status" defaultValue={check?.status ?? 'pending'}>
            <SelectTrigger className="w-full" />
            <SelectContent>
              {[ 'pending', 'paid', 'bounced' ].map(s => (
                <SelectItem key={s} value={s}>{t(`checks.status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

export function ChecksPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const {
    checkbooks,
    checks,
    addCheckbook,
    updateCheckbook,
    removeCheckbook,
    addCheck,
    updateCheck,
    removeCheck,
  } = useLoans()

  const [selectedBookId, setSelectedBookId] = useState<string | null>(checkbooks[0]?.id ?? null)
  const [addBookOpen, setAddBookOpen] = useState(false)
  const [editBookOpen, setEditBookOpen] = useState(false)
  const [editBook, setEditBook] = useState<Checkbook | null>(null)
  const [deleteBookOpen, setDeleteBookOpen] = useState(false)
  const [deleteBook, setDeleteBook] = useState<Checkbook | null>(null)
  const [addCheckOpen, setAddCheckOpen] = useState(false)
  const [editCheckOpen, setEditCheckOpen] = useState(false)
  const [editCheck, setEditCheck] = useState<Check | null>(null)
  const [deleteCheckOpen, setDeleteCheckOpen] = useState(false)
  const [deleteCheck, setDeleteCheck] = useState<Check | null>(null)

  useEffect(() => {
    if (selectedBookId && !checkbooks.find(b => b.id === selectedBookId)) {
      setSelectedBookId(checkbooks[0]?.id ?? null)
    }
    if (!selectedBookId && checkbooks.length > 0) {
      setSelectedBookId(checkbooks[0].id)
    }
  }, [checkbooks, selectedBookId])

  const book = checkbooks.find(b => b.id === selectedBookId)
  const bookChecks = useMemo(
    () =>
      checks
        .filter(c => c.checkbookId === selectedBookId)
        .sort((a, b) => monthIndexFrom(a.dueYear, a.dueMonth) - monthIndexFrom(b.dueYear, b.dueMonth) || a.dueDay - b.dueDay),
    [checks, selectedBookId],
  )
  const summary = checkSummary(bookChecks)

  const statusBadge = (status: Check['status']) => {
    const variantMap: Record<Check['status'], 'secondary' | 'default' | 'destructive'> = {
      pending: 'secondary',
      paid: 'default',
      bounced: 'destructive',
    }
    return <Badge variant={variantMap[status]}>{t(`checks.status.${status}`)}</Badge>
  }

  const handleAddBook = (draft: CheckbookDraft) => addCheckbook(draft)
  const handleEditBook = (draft: CheckbookDraft) => {
    if (!editBook) return
    updateCheckbook(editBook.id, draft)
  }
  const handleDeleteBook = () => {
    if (!deleteBook) return
    removeCheckbook(deleteBook.id)
    setDeleteBook(null)
    setDeleteBookOpen(false)
  }
  const handleAddCheck = (draft: CheckDraft) => addCheck(draft)
  const handleEditCheck = (draft: CheckDraft) => {
    if (!editCheck) return
    updateCheck(editCheck.id, draft)
  }
  const handleDeleteCheck = () => {
    if (!deleteCheck) return
    removeCheck(deleteCheck.id)
    setDeleteCheck(null)
    setDeleteCheckOpen(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.checks')}</h1>

      {/* Checkbook picker */}
      <div className="flex flex-wrap gap-2">
        {checkbooks.map(b => (
          <div key={b.id} className="flex items-center gap-1">
            <Button
              type="button"
              variant={selectedBookId === b.id ? 'default' : 'outline'}
              onClick={() => setSelectedBookId(b.id)}
            >
              {b.name}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={e => {
                e.stopPropagation()
                setEditBook(b)
                setEditBookOpen(true)
              }}
              aria-label={t('loans.edit')}
            >
              <Edit3 className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={e => {
                e.stopPropagation()
                setDeleteBook(b)
                setDeleteBookOpen(true)
              }}
              aria-label={t('loans.delete')}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" onClick={() => setAddBookOpen(true)} aria-label={t('checks.addCheckbook')}>
          <Plus className="size-4" aria-hidden /> {t('checks.addCheckbook')}
        </Button>
      </div>

      {book && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <Card className="p-3">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('checks.list')}</p>
                  <p className="font-semibold">{bookChecks.length}</p>
                </div>
                <Clock className="size-4" aria-hidden />
              </CardContent>
            </Card>
            <Card className="p-3">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('checks.status.pending')}</p>
                  <p className="font-semibold">{formatMoney(summary.pendingAmount, lang)}</p>
                </div>
                <span className="text-muted-foreground">{summary.pending}</span>
              </CardContent>
            </Card>
            <Card className="p-3">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('checks.status.paid')}</p>
                  <p className="font-semibold">{formatMoney(summary.paid, lang)}</p>
                </div>
                <span className="text-muted-foreground">{summary.paid}</span>
              </CardContent>
            </Card>
            <Card className="p-3">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('checks.status.bounced')}</p>
                  <p className="font-semibold text-destructive">{formatMoney(summary.bounced, lang)}</p>
                </div>
                <span className="text-muted-foreground">{summary.bounced}</span>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{t('checks.list')}</h2>
              <Button type="button" size="sm" onClick={() => setAddCheckOpen(true)}>
                <Plus className="size-4" aria-hidden /> {t('checks.addCheck')}
              </Button>
            </div>

            {bookChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('checks.empty')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-start" scope="col">{t('checks.payee')}</th>
                    <th className="text-start" scope="col">{t('checks.amount')} ({t('common.toman')})</th>
                    <th className="text-start" scope="col">{t('checks.dueDate')}</th>
                    <th className="text-start" scope="col">{t('checks.statusLabel')}</th>
                    <th className="text-start" scope="col">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookChecks.map(c => {
                    const { year: dy, month: dm } = yearMonthOf(monthIndexFrom(c.dueYear, c.dueMonth))
                    return (
                      <tr key={c.id} className="border-b">
                        <td className="p-3">{c.payee}</td>
                        <td className="p-3 font-mono tabular-nums">{formatMoney(c.amount, lang)}</td>
                        <td className="p-3">
                          {dy} / {String(dm).padStart(2, '0')} / {String(c.dueDay).padStart(2, '0')}
                        </td>
                        <td className="p-3">{statusBadge(c.status)}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditCheck(c)
                                setEditCheckOpen(true)
                              }}
                              aria-label={t('loans.edit')}
                            >
                              <Edit3 className="size-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDeleteCheck(c)
                                setDeleteCheckOpen(true)
                              }}
                              aria-label={t('loans.delete')}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <CheckbookDialog book={null} open={addBookOpen} onOpenChange={setAddBookOpen} onSave={handleAddBook} />
      <CheckbookDialog
        book={editBook}
        open={editBookOpen}
        onOpenChange={open => {
          if (!open) {
            setEditBookOpen(false)
            setEditBook(null)
          }
        }}
        onSave={handleEditBook}
      />
      <ConfirmDialog
        open={deleteBookOpen}
        title={t('checks.deleteCheckbookTitle', { name: deleteBook?.name ?? '' })}
        desc={t('checks.deleteCheckbookDesc', {
          count: checks.filter(c => c.checkbookId === deleteBook?.id).length,
        })}
        onConfirm={handleDeleteBook}
        onOpenChange={open => {
          if (!open) setDeleteBook(null)
          setDeleteBookOpen(open)
        }}
      />
      <CheckDialog bookId={selectedBookId ?? ''} check={null} open={addCheckOpen} onOpenChange={setAddCheckOpen} onSave={handleAddCheck} />
      <CheckDialog
        bookId={selectedBookId ?? ''}
        check={editCheck}
        open={editCheckOpen}
        onOpenChange={open => {
          if (!open) {
            setEditCheckOpen(false)
            setEditCheck(null)
          }
        }}
        onSave={handleEditCheck}
      />
      <ConfirmDialog
        open={deleteCheckOpen}
        title={t('checks.deleteCheckTitle', { payee: deleteCheck?.payee ?? '' })}
        desc={t('checks.deleteCheckDesc')}
        onConfirm={handleDeleteCheck}
        onOpenChange={open => {
          if (!open) setDeleteCheck(null)
          setDeleteCheckOpen(open)
        }}
      />
    </div>
  )
}