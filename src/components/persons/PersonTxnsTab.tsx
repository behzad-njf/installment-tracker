import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { monthIndexFrom, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import { openingSplit, sortPersonTxns, totalOf } from '@/lib/persons'
import type { Lang, PersonAccount, PersonTxn, PersonTxnKind } from '@/lib/types'

function dateLabel(txn: PersonTxn, lang: Lang): string {
  return `${formatNumber(txn.day, lang)} ${monthName(monthIndexFrom(txn.year, txn.month), lang)} ${formatYear(txn.year, lang)}`
}

export function PersonTxnsTab({
  kind,
  txns,
  accounts,
  opening = 0,
  onAdd,
  onRemove,
  onEdit,
}: {
  kind: PersonTxnKind
  txns: PersonTxn[]
  accounts: PersonAccount[]
  opening?: number
  onAdd: () => void
  onRemove: (txn: PersonTxn) => void
  onEdit?: (txn: PersonTxn) => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const rows = sortPersonTxns(txns)
  const split = openingSplit(opening)
  /** The opening balance shows up as the first row, on the side it belongs to. */
  const openingRow = kind === 'payment' ? split.payment : split.receipt
  const total = totalOf(txns, kind) + openingRow
  const accountOf = (id?: string): PersonAccount | undefined =>
    id === undefined ? undefined : accounts.find(account => account.id === id)
  const accountLabel = (id?: string): string => {
    const acc = accountOf(id)
    if (!acc) return ''
    return acc.holderName ? `${acc.bank} (${acc.holderName})` : acc.bank
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {kind === 'payment' ? t('persons.tabs.payments') : t('persons.tabs.receipts')}
        </h2>
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="size-4" aria-hidden />
          {kind === 'payment' ? t('persons.addPayment') : t('persons.addReceipt')}
        </Button>
      </div>

      {rows.length === 0 && openingRow === 0 ? (
        <p className="text-muted-foreground text-sm">
          {kind === 'payment' ? t('persons.noPayments') : t('persons.noReceipts')}
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-xl border">
            {openingRow === 0 ? null : (
              <li className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t('persons.openingAmount')}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{t('persons.openingHint')}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(openingRow, lang)}
                </span>
                <span className="size-8 shrink-0" aria-hidden />
              </li>
            )}
            {rows.map(txn => {
              const label = accountLabel(txn.accountId)
              return (
                <li key={txn.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{txn.title || t('persons.untitled')}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {dateLabel(txn, lang)}{label ? ` · ${label}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(txn.amount, lang)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {onEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('persons.editTxnAria', { amount: formatMoney(txn.amount, lang) })}
                        onClick={() => onEdit(txn)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('persons.deleteTxnAria', { amount: formatMoney(txn.amount, lang) })}
                      onClick={() => onRemove(txn)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="flex items-center justify-between text-sm font-semibold">
            <span>
              {kind === 'payment' ? t('persons.paymentsTotal') : t('persons.receiptsTotal')}
            </span>
            <span className="tabular-nums">
              {formatMoney(total, lang)} {t('common.toman')}
            </span>
          </p>
        </>
      )}
    </div>
  )
}
