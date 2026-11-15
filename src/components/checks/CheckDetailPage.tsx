import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMoney, formatNumber } from '@/lib/money'
import { monthName, monthIndexFrom } from '@/lib/jalali'
import { useLocale } from '@/hooks/useLocale'
import { useLoans } from '@/hooks/useLoans'
import { navigate } from '@/hooks/useRoute'

interface Props {
  bookId: string
  serial: number
}

export function CheckDetailPage({ bookId, serial }: Props) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const { checkbooks, checks } = useLoans()

  const check = checks.find(c => c.checkbookId === bookId && c.serial === serial)
  if (!check) return null

  const book = checkbooks.find(b => b.id === bookId)
  const dueLabel = check.dueDay !== undefined && check.dueYear !== undefined && check.dueMonth !== undefined
    ? `${formatNumber(check.dueDay, lang)} ${monthName(monthIndexFrom(check.dueYear, check.dueMonth), lang)}`
    : '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => navigate({ kind: 'checks.book', bookId })} aria-label={t('common.back')}>
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t('checks.serial')} {check.serial}</h1>
      </div>

      <Card className="p-3">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('checks.serial')} {check.serial}</p>
          <p className="font-semibold">{t('checks.payee')} {check.payee || t('checks.blankBadge')}</p>
          <p className="text-sm text-muted-foreground">{t('checks.purpose')} {check.purpose || ''}</p>
          <p className="text-sm text-muted-foreground">{t('checks.amount')} {formatMoney(check.amount, lang)}</p>
          <p className="text-sm text-muted-foreground">{t('checks.dueDate')} {dueLabel}</p>
          <p className="text-sm text-muted-foreground">{t('checks.status')} {t(`checks.status.${check.status}`)}</p>
          <p className="text-sm text-muted-foreground">{t('checks.note')} {check.note || ''}</p>
          {book && (
            <p className="text-sm text-muted-foreground">{t('checks.checkbook')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}