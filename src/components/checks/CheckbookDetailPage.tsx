import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckbookChecks } from '@/components/checks/CheckbookChecks'
import { CheckDialog } from '@/components/checks/CheckDialog'
import { CheckStatusDialog } from '@/components/checks/CheckStatusDialog'
import { BulkChecksDialog } from '@/components/checks/BulkChecksDialog'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { navigate } from '@/hooks/useRoute'
import { monthIndexFrom } from '@/lib/jalali'
import { formatNumber } from '@/lib/money'
import type { Check, CheckDraft } from '@/lib/types'

interface Props {
  bookId: string
}

export function CheckbookDetailPage({ bookId }: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const {
    checkbooks,
    checks,
    addCheck,
    addChecksBulk,
    updateCheck,
    setCheckStatus,
    removeCheck,
  } = useLoans()

  const [addCheckOpen, setAddCheckOpen] = useState(false)
  const [editCheck, setEditCheck] = useState<Check | null>(null)
  const [deleteCheck, setDeleteCheck] = useState<Check | null>(null)
  const [statusCheck, setStatusCheck] = useState<Check | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const book = checkbooks.find(b => b.id === bookId)

  const bookChecks = useMemo(
    () =>
      checks
        .filter(c => c.checkbookId === bookId)
        .sort((a, b) => {
          const dueA = a.dueYear !== undefined && a.dueMonth !== undefined ? monthIndexFrom(a.dueYear, a.dueMonth) : null
          const dueB = b.dueYear !== undefined && b.dueMonth !== undefined ? monthIndexFrom(b.dueYear, b.dueMonth) : null
          if (dueA === null && dueB !== null) return 1
          if (dueB === null && dueA !== null) return -1
          if (dueA !== null && dueB !== null && dueA !== dueB) return dueA - dueB
          if ((a.dueDay ?? 0) !== (b.dueDay ?? 0)) return (a.dueDay ?? 0) - (b.dueDay ?? 0)
          return (a.serial ?? 0) - (b.serial ?? 0)
        }),
    [checks, bookId],
  )

  const suggestedSerial = useMemo(() => {
    const used = bookChecks.reduce((max, c) => Math.max(max, c.serial ?? 0), 0)
    return Math.max(used + 1, book?.serialFrom ?? 1)
  }, [book, bookChecks])

  const usedSerials = useMemo(
    () => bookChecks.map(c => c.serial).filter((serial): serial is number => serial !== undefined),
    [bookChecks],
  )

  if (!book) return null

  const handleBulk = (from: number, to: number) => {
    const created = addChecksBulk(book.id, from, to)
    if (created > 0) toast.success(t('checks.bulkCreated', { count: formatNumber(created, lang) }))
    else toast.info(t('checks.bulkEmpty'))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => navigate('checks')} aria-label={t('common.back')}>
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{book.bank}</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {book.bank} · {book.accountNumber} · {t('checks.remaining', { count: bookChecks.length })}
      </p>

      <CheckbookChecks
        book={book}
        checks={bookChecks}
        onAdd={() => setAddCheckOpen(true)}
        onBulk={() => setBulkOpen(true)}
        onEdit={setEditCheck}
        onDelete={setDeleteCheck}
        onStatusChange={setStatusCheck}
      />

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
      {statusCheck ? (
        <CheckStatusDialog
          check={statusCheck}
          onOpenChange={open => {
            if (!open) setStatusCheck(null)
          }}
          onSubmit={(status, patch) => {
            const ok = setCheckStatus(statusCheck.id, status, patch)
            if (!ok) toast.error(t('checks.statusNotAllowed'))
            return ok
          }}
        />
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
