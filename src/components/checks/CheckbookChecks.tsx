import { useTranslation } from 'react-i18next'
import { Edit3, Layers, Plus, RefreshCw, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/hooks/useLocale'
import { checkSummary, remainingChecks } from '@/lib/checks'
import { monthName } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import type { Check, Checkbook, CheckStatus } from '@/lib/types'

const STATUS_VARIANT: Record<CheckStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  blank: 'outline',
  issued: 'default',
  cleared: 'secondary',
  bounced: 'destructive',
  void: 'outline',
}

/** Status is read-only here — every move goes through the status dialog. */
function StatusButton({ check, onClick }: { check: Check; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 gap-1 px-2 text-xs"
      onClick={onClick}
      aria-label={t('checks.changeStatusAria', { status: t(`checks.status.${check.status}`) })}
    >
      <Badge variant={STATUS_VARIANT[check.status]}>{t(`checks.status.${check.status}`)}</Badge>
      <RefreshCw className="size-3" aria-hidden />
    </Button>
  )
}

export function CheckbookChecks({
  book,
  checks,
  onAdd,
  onBulk,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  book: Checkbook
  checks: Check[]
  onAdd: () => void
  onBulk: () => void
  onEdit: (check: Check) => void
  onDelete: (check: Check) => void
  onStatusChange: (check: Check) => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const summary = checkSummary(checks)
  const remaining = remainingChecks(book, checks)

  const dueLabel = (check: Check): string =>
    check.dueDay !== undefined && check.dueYear !== undefined && check.dueMonth !== undefined
      ? `${formatNumber(check.dueDay, lang)} ${monthName(
          check.dueYear * 12 + (check.dueMonth - 1),
          lang,
        )}`
      : '—'

  const payeeLabel = (check: Check) =>
    check.payee ? check.payee : <Badge variant="outline">{t('checks.blankBadge')}</Badge>

  const actions = (check: Check) => (
    <div className="flex gap-1">
      <Button type="button" size="icon-sm" variant="outline" onClick={() => onEdit(check)} aria-label={t('loans.edit')}>
        <Edit3 className="size-4" aria-hidden />
      </Button>
      <Button type="button" size="icon-sm" variant="outline" onClick={() => onDelete(check)} aria-label={t('loans.delete')}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  )

  return (
    <div id="book-checks" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{book.name}</h2>
          <p className="text-xs text-muted-foreground">
            {book.bank}
            {book.accountNumber ? ` · ${book.accountNumber}` : ''} ·{' '}
            {t('checks.remaining', { count: formatNumber(remaining, lang) })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onBulk}>
            <Layers className="size-4" aria-hidden /> {t('checks.addBulk')}
          </Button>
          <Button type="button" size="sm" onClick={onAdd}>
            <Plus className="size-4" aria-hidden /> {t('checks.addCheck')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.list')}</p>
            <p className="font-semibold">{formatNumber(summary.count, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.blank')}</p>
            <p className="font-semibold">{formatNumber(summary.counts.blank, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.issued')}</p>
            <p className="font-semibold">{formatMoney(summary.amounts.issued, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.cleared')}</p>
            <p className="font-semibold">{formatMoney(summary.amounts.cleared, lang)}</p>
          </CardContent>
        </Card>
      </div>

      {checks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('checks.empty')}</p>
      ) : (
        <>
          {/* Desktop: table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr>
                <th className="text-start" scope="col">{t('checks.serial')}</th>
                <th className="text-start" scope="col">{t('checks.payee')}</th>
                <th className="text-start" scope="col">{t('checks.purpose')}</th>
                <th className="text-start" scope="col">{t('checks.amount')}</th>
                <th className="text-start" scope="col">{t('checks.dueDate')}</th>
                <th className="text-start" scope="col">{t('checks.statusLabel')}</th>
                <th className="text-start" scope="col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(check => (
                <tr key={check.id} className="border-b">
                  <td className="p-2 tabular-nums">{check.serial !== undefined ? formatNumber(check.serial, lang) : '—'}</td>
                  <td className="p-2">{payeeLabel(check)}</td>
                  <td className="p-2 text-muted-foreground">{check.purpose ?? ''}</td>
                  <td className="p-2 tabular-nums">{check.amount > 0 ? formatMoney(check.amount, lang) : '—'}</td>
                  <td className="p-2">{dueLabel(check)}</td>
                  <td className="p-2"><StatusButton check={check} onClick={() => onStatusChange(check)} /></td>
                  <td className="p-2">{actions(check)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: cards */}
          <div className="space-y-2 md:hidden">
            {checks.map(check => (
              <Card key={check.id} className="p-3">
                <CardContent className="space-y-2 px-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {check.serial !== undefined ? `#${formatNumber(check.serial, lang)} · ` : ''}
                        {payeeLabel(check)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dueLabel(check)}
                        {check.purpose ? ` · ${check.purpose}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">
                      {check.amount > 0 ? formatMoney(check.amount, lang) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusButton check={check} onClick={() => onStatusChange(check)} />
                    {actions(check)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
