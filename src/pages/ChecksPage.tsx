import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckbookCard } from '@/components/checks/CheckbookCard'
import { CheckbookChecks } from '@/components/checks/CheckbookChecks'
import { CheckbookDialog } from '@/components/checks/CheckbookDialog'
import { CheckDialog } from '@/components/checks/CheckDialog'
import { BulkChecksDialog } from '@/components/checks/BulkChecksDialog'
import { NearDueChecks } from '@/components/checks/NearDueChecks'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { monthIndexFrom } from '@/lib/jalali'
import { formatNumber } from '@/lib/money'
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
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {t('common.delete')}
          </Button>
        </DialogFooter>
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
    addChecksBulk,
    updateCheck,
    removeCheck,
  } = useLoans()

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [addBookOpen, setAddBookOpen] = useState(false)
  const [editBook, setEditBook] = useState<Checkbook | null>(null)
  const [deleteBook, setDeleteBook] = useState<Checkbook | null>(null)
  const [addCheckOpen, setAddCheckOpen] = useState(false)
  const [editCheck, setEditCheck] = useState<Check | null>(null)
  const [deleteCheck, setDeleteCheck] = useState<Check | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    if (selectedBookId && !checkbooks.some(b => b.id === selectedBookId)) setSelectedBookId(null)
  }, [checkbooks, selectedBookId])

  const book = checkbooks.find(b => b.id === selectedBookId) ?? null
  const bookChecks = useMemo(
    () =>
      checks
        .filter(c => c.checkbookId === selectedBookId)
        .sort(
          (a, b) =>
            monthIndexFrom(a.dueYear, a.dueMonth) - monthIndexFrom(b.dueYear, b.dueMonth) ||
            a.dueDay - b.dueDay ||
            (a.serial ?? 0) - (b.serial ?? 0),
        ),
    [checks, selectedBookId],
  )

  const suggestedSerial = useMemo(() => {
    if (!book) return 1
    const used = bookChecks.reduce((max, c) => Math.max(max, c.serial ?? 0), 0)
    return Math.max(used + 1, book.serialFrom ?? 1)
  }, [book, bookChecks])

  const usedSerials = useMemo(
    () => bookChecks.map(c => c.serial).filter((serial): serial is number => serial !== undefined),
    [bookChecks],
  )

  const openBook = (bookId: string) => {
    setSelectedBookId(bookId)
    requestAnimationFrame(() => {
      document.getElementById('book-checks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleBulk = (from: number, to: number) => {
    if (!book) return
    const created = addChecksBulk(book.id, from, to)
    if (created > 0) toast.success(t('checks.bulkCreated', { count: formatNumber(created, lang) }))
    else toast.info(t('checks.bulkEmpty'))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.checks')}</h1>

      <NearDueChecks checks={checks} checkbooks={checkbooks} onSelectBook={openBook} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{t('checks.checkbooks')}</h2>
          <Button type="button" size="sm" onClick={() => setAddBookOpen(true)}>
            <Plus className="size-4" aria-hidden /> {t('checks.addCheckbook')}
          </Button>
        </div>
        {checkbooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('checks.noBooks')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {checkbooks.map(item => (
              <CheckbookCard
                key={item.id}
                book={item}
                checks={checks}
                onSelect={() => openBook(item.id)}
                onEdit={() => setEditBook(item)}
                onDelete={() => setDeleteBook(item)}
              />
            ))}
          </div>
        )}
      </section>

      {book ? (
        <CheckbookChecks
          book={book}
          checks={bookChecks}
          onAdd={() => setAddCheckOpen(true)}
          onBulk={() => setBulkOpen(true)}
          onEdit={setEditCheck}
          onDelete={setDeleteCheck}
          onStatusChange={(check, status: CheckStatus) => updateCheck(check.id, { status })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('checks.selectBook')}</p>
      )}

      <CheckbookDialog
        book={null}
        open={addBookOpen}
        onOpenChange={setAddBookOpen}
        onSave={(draft: CheckbookDraft) => addCheckbook(draft)}
      />
      <CheckbookDialog
        book={editBook}
        open={editBook !== null}
        onOpenChange={open => {
          if (!open) setEditBook(null)
        }}
        onSave={(draft: CheckbookDraft) => {
          if (editBook) updateCheckbook(editBook.id, draft)
        }}
      />
      <ConfirmDialog
        open={deleteBook !== null}
        title={t('checks.deleteCheckbookTitle', { name: deleteBook?.name ?? '' })}
        desc={t('checks.deleteCheckbookDesc', {
          count: checks.filter(c => c.checkbookId === deleteBook?.id).length,
        })}
        onConfirm={() => {
          if (deleteBook) removeCheckbook(deleteBook.id)
          setDeleteBook(null)
        }}
        onOpenChange={open => {
          if (!open) setDeleteBook(null)
        }}
      />
      {book ? (
        <>
          <CheckDialog
            bookId={book.id}
            check={null}
            suggestedSerial={suggestedSerial}
            usedSerials={usedSerials}
            open={addCheckOpen}
            onOpenChange={setAddCheckOpen}
            onSave={(draft: CheckDraft) => addCheck(draft)}
          />
          <CheckDialog
            bookId={book.id}
            check={editCheck}
            suggestedSerial={suggestedSerial}
            usedSerials={usedSerials}
            open={editCheck !== null}
            onOpenChange={open => {
              if (!open) setEditCheck(null)
            }}
            onSave={(draft: CheckDraft) => {
              if (editCheck) updateCheck(editCheck.id, draft)
            }}
          />
          <BulkChecksDialog
            book={book}
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            onSave={handleBulk}
          />
        </>
      ) : null}
      <ConfirmDialog
        open={deleteCheck !== null}
        title={t('checks.deleteCheckTitle', {
          payee:
            deleteCheck?.payee ||
            (deleteCheck?.serial !== undefined
              ? `${t('checks.serial')} ${deleteCheck.serial}`
              : ''),
        })}
        desc={t('checks.deleteCheckDesc')}
        onConfirm={() => {
          if (deleteCheck) removeCheck(deleteCheck.id)
          setDeleteCheck(null)
        }}
        onOpenChange={open => {
          if (!open) setDeleteCheck(null)
        }}
      />
    </div>
  )
}
