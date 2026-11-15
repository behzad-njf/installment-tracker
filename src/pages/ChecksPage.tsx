import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckbookCard } from '@/components/checks/CheckbookCard'
import { CheckbookDialog } from '@/components/checks/CheckbookDialog'
import { NearDueChecks } from '@/components/checks/NearDueChecks'
import { useLoans } from '@/hooks/useLoans'
import { navigate } from '@/hooks/useRoute'
import type { Checkbook, CheckbookDraft } from '@/lib/types'

export function ChecksPage() {
  const { t } = useTranslation()
  const { checkbooks, checks, addCheckbook, updateCheckbook, removeCheckbook } = useLoans()

  const [addBookOpen, setAddBookOpen] = useState(false)
  const [editBook, setEditBook] = useState<Checkbook | null>(null)
  const [deleteBook, setDeleteBook] = useState<Checkbook | null>(null)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.checks')}</h1>

      <NearDueChecks checks={checks} checkbooks={checkbooks} onSelectBook={bookId => navigate({ kind: 'checks.book', bookId })} />

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
                onSelect={() => navigate({ kind: 'checks.book', bookId: item.id })}
                onEdit={() => setEditBook(item)}
                onDelete={() => setDeleteBook(item)}
              />
            ))}
          </div>
        )}
      </section>

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