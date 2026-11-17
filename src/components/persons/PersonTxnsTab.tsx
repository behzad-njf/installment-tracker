import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { monthIndexFrom, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber, formatYear } from '@/lib/money'
import { sortPersonTxns, totalOf } from '@/lib/persons'
import type { Lang, PersonAccount, PersonTxn, PersonTxnKind } from '@/lib/types'

function dateLabel(txn: PersonTxn, lang: Lang): string {
  return `${formatNumber(txn.day, lang)} ${monthName(monthIndexFrom(txn.year, txn.month), lang)} ${formatYear(txn.year, lang)}`
}

export function PersonTxnsTab({
  kind,
  txns,
  accounts,
  onAdd,
  onRemove,
}: {
  kind: PersonTxnKind
  txns: PersonTxn[]
  accounts: PersonAccount[]
  onAdd: () => void
  onRemove: (txn: PersonTxn) => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const rows = sortPersonTxns(txns)
  const total = totalOf(txns, kind)
  const bankOf = (id?: string): string | undefined =>
    id === undefined ? undefined : accounts.find(account => account.id === id)?.bank

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

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {kind === 'payment' ? t('persons.noPayments') : t('persons.noReceipts')}
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-xl border">
            {rows.map(txn => (
              <li key={txn.id} className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{txn.title || t('persons.untitled')}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {dateLabel(txn, lang)}
                    {bankOf(txn.accountId) ? ` · ${bankOf(txn.accountId)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(txn.amount, lang)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('persons.deleteTxnAria', { amount: formatMoney(txn.amount, lang) })}
                  onClick={() => onRemove(txn)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
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
