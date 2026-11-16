import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckbookCard } from '@/components/checks/CheckbookCard'
import { CheckbookDialog } from '@/components/checks/CheckbookDialog'
import { IssueCheckDialog } from '@/components/checks/IssueCheckDialog'
import { NearDueChecks } from '@/components/checks/NearDueChecks'
import { useLoans } from '@/hooks/useLoans'
import { useLocale } from '@/hooks/useLocale'
import { navigate } from '@/hooks/useRoute'
import { checkMonthIndex } from '@/lib/checks'
import { currentMonthIndex, monthIndexFrom, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import type { Checkbook, CheckbookDraft } from '@/lib/types'

export function ChecksPage() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { checkbooks, checks, addCheckbook, updateCheckbook, removeCheckbook } = useLoans()

  const [addBookOpen, setAddBookOpen] = useState(false)
  const [editBook, setEditBook] = useState<Checkbook | null>(null)
  const [deleteBook, setDeleteBook] = useState<Checkbook | null>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  const [monthlyMonth, setMonthlyMonth] = useState<number | null>(null)

  const thisMonth = currentMonthIndex()
  const nextMonth = thisMonth + 1
  const issuedThisMonth = checks.filter(c => c.status === 'issued' && checkMonthIndex(c) === thisMonth)
  const issuedNextMonth = checks.filter(c => c.status === 'issued' && checkMonthIndex(c) === nextMonth)
  const issuedCount = issuedThisMonth.length
  const issuedTotal = issuedThisMonth.reduce((sum, c) => sum + c.amount, 0)
  const nextCount = issuedNextMonth.length
  const nextTotal = issuedNextMonth.reduce((sum, c) => sum + c.amount, 0)
  const monthlyChecks = monthlyMonth === nextMonth ? issuedNextMonth : issuedThisMonth

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('nav.checks')}</h1>
        <Button type="button" size="sm" onClick={() => setIssueOpen(true)}>
          <Plus className="size-4" aria-hidden /> {t('checks.issueCheck')}
        </Button>
      </div>

      <div className="flex items-stretch gap-3">
        <button
          type="button"
          onClick={() => setMonthlyMonth(thisMonth)}
          className="block min-w-0 flex-1 rounded-md text-start"
          aria-label={t('checks.issuedThisMonth')}
        >
          <Card className="flex h-36 flex-col justify-between gap-2 p-3 transition-colors hover:bg-accent">
            <div className="truncate text-sm font-medium text-muted-foreground">
              {t('checks.issuedThisMonth')}
            </div>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{formatNumber(issuedCount, lang)}</span>
              <span className="text-sm text-muted-foreground">{t('checks.checkUnit')}</span>
            </div>
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="truncate text-lg font-semibold tabular-nums">{formatMoney(issuedTotal, lang)}</span>
              <span className="shrink-0 text-sm text-muted-foreground">{t('common.toman')}</span>
            </div>
          </Card>
        </button>
        <button
          type="button"
          onClick={() => setMonthlyMonth(nextMonth)}
          className="block w-36 shrink-0 rounded-md text-start"
          aria-label={t('checks.issuedNextMonth')}
        >
          <Card className="flex h-36 flex-col justify-between gap-1 p-3 transition-colors hover:bg-accent">
            <div className="truncate text-xs font-medium text-muted-foreground">
              {t('checks.issuedNextMonth')}
            </div>
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(nextCount, lang)}</span>
              <span className="truncate text-xs text-muted-foreground">{t('checks.checkUnit')}</span>
            </div>
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="truncate text-sm font-semibold tabular-nums">{formatMoney(nextTotal, lang)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t('common.toman')}</span>
            </div>
          </Card>
        </button>
      </div>

      <NearDueChecks checks={checks} />

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
      <IssueCheckDialog open={issueOpen} onOpenChange={setIssueOpen} />
      {monthlyMonth !== null ? (
        <Dialog open onOpenChange={open => {
          if (!open) setMonthlyMonth(null)
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {monthlyMonth === nextMonth ? t('checks.issuedNextMonth') : t('checks.issuedThisMonth')}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {monthlyChecks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('checks.empty')}</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {monthlyChecks.map(check => (
                      <tr key={check.id} className="border-b border-input last:border-0">
                        <td className="min-w-0 py-1.5 pe-2">
                          <span className="block truncate">{check.payee || '—'}</span>
                        </td>
                        <td className="min-w-0 py-1.5 pe-2">
                          <span className="block truncate">{check.purpose || '—'}</span>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pe-2 text-end tabular-nums">
                          {formatMoney(check.amount, lang)}
                        </td>
                        <td className="whitespace-nowrap py-1.5 text-end">
                          {check.dueDay !== undefined
                            ? `${formatNumber(check.dueDay, lang)} ${monthName(monthIndexFrom(check.dueYear ?? 0, check.dueMonth ?? 1), lang)} ${formatYear(check.dueYear ?? 0, lang)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      <ConfirmDialog
        open={deleteBook !== null}
        title={t('checks.deleteCheckbookTitle')}
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