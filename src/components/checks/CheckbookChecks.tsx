import { useTranslation } from 'react-i18next'
import { Edit3, Layers, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { CHECK_STATUS_KEYS, checkSummary, remainingChecks } from '@/lib/checks'
import { monthIndexFrom, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import type { Check, Checkbook, CheckStatus } from '@/lib/types'

function StatusSelect({ check, onChange }: { check: Check; onChange: (status: CheckStatus) => void }) {
  const { t } = useTranslation()
  return (
    <Select value={check.status} onValueChange={value => onChange(value as CheckStatus)}>
      <SelectTrigger className="h-7 w-28 text-xs" aria-label={t('checks.statusLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHECK_STATUS_KEYS.map(status => (
          <SelectItem key={status} value={status}>{t(`checks.status.${status}`)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  onStatusChange: (check: Check, status: CheckStatus) => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const summary = checkSummary(checks)
  const remaining = remainingChecks(book, checks)

  const dueLabel = (check: Check): string =>
    `${formatNumber(check.dueDay, lang)} ${monthName(monthIndexFrom(check.dueYear, check.dueMonth), lang)}`

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
            <p className="font-semibold">{formatNumber(checks.length, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.pending')}</p>
            <p className="font-semibold">{formatMoney(summary.pendingAmount, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.paid')}</p>
            <p className="font-semibold">{formatMoney(summary.paid, lang)}</p>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardContent className="px-0">
            <p className="text-xs text-muted-foreground">{t('checks.status.bounced')}</p>
            <p className="font-semibold text-destructive">{formatMoney(summary.bounced, lang)}</p>
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
                  <td className="p-2">
                    {check.payee ? check.payee : <Badge variant="outline">{t('checks.unassigned')}</Badge>}
                  </td>
                  <td className="p-2 text-muted-foreground">{check.purpose ?? ''}</td>
                  <td className="p-2 tabular-nums">{check.amount > 0 ? formatMoney(check.amount, lang) : '—'}</td>
                  <td className="p-2">{dueLabel(check)}</td>
                  <td className="p-2"><StatusSelect check={check} onChange={status => onStatusChange(check, status)} /></td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="outline" onClick={() => onEdit(check)} aria-label={t('loans.edit')}>
                        <Edit3 className="size-4" aria-hidden />
                      </Button>
                      <Button type="button" size="icon-sm" variant="outline" onClick={() => onDelete(check)} aria-label={t('loans.delete')}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
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
                        {check.payee ? check.payee : <Badge variant="outline">{t('checks.unassigned')}</Badge>}
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
                    <StatusSelect check={check} onChange={status => onStatusChange(check, status)} />
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="outline" onClick={() => onEdit(check)} aria-label={t('loans.edit')}>
                        <Edit3 className="size-4" aria-hidden />
                      </Button>
                      <Button type="button" size="icon-sm" variant="outline" onClick={() => onDelete(check)} aria-label={t('loans.delete')}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
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
