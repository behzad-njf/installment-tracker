import { useTranslation } from 'react-i18next'
import { CreditCard, Edit3, Trash2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
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
  const blankCount = checks.filter(c => c.checkbookId === book.id && c.status === 'blank').length

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
            <span className="truncate">{book.bank}</span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">
            {book.accountNumber ?? ''}
          </span>
          <Badge variant={blankCount === 0 ? 'destructive' : 'secondary'} className="mt-2">
            {blankCount === 0 ? t('checks.exhausted') : t('checks.blankCount', { count: formatNumber(blankCount, lang) })}
          </Badge>
        </button>
        <div className="flex flex-col gap-1">
          <Button type="button" size="icon-sm" variant="outline" onClick={onEdit} aria-label={t('loans.edit')}>
            <Edit3 className="size-4" aria-hidden />
          </Button>
          <Button type="button" size="icon-sm" variant="destructive" onClick={onDelete} aria-label={t('loans.delete')}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </Card>
  )
}
