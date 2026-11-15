import { useTranslation } from 'react-i18next'
import { CreditCard, Edit3, Trash2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { remainingChecks } from '@/lib/checks'
import { formatNumber } from '@/lib/money'
import type { Check, Checkbook } from '@/lib/types'

export function CheckbookCard({
  book,
  checks,
  onSelect,
  onEdit,
  onDelete,
}: {
  book: Checkbook
  checks: Check[]
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const remaining = remainingChecks(book, checks)

  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="flex-1 min-w-0 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onSelect}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{book.bank || book.name}</span>
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{book.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">
            {book.accountNumber ?? ''}
          </span>
          <Badge variant="secondary" className="mt-2">
            {t('checks.remaining', { count: formatNumber(remaining, lang) })}
          </Badge>
        </button>
        <div className="flex gap-1">
          <Button type="button" size="icon-sm" variant="outline" onClick={onEdit} aria-label={t('loans.edit')}>
            <Edit3 className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={onDelete}
            aria-label={t('loans.delete')}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </Card>
  )
}
