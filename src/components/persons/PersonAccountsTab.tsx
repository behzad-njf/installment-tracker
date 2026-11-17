import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PersonAccount } from '@/lib/types'

export function PersonAccountsTab({
  accounts,
  onAdd,
  onRemove,
}: {
  accounts: PersonAccount[]
  onAdd: () => void
  onRemove: (account: PersonAccount) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{t('persons.tabs.accounts')}</h2>
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="size-4" aria-hidden /> {t('persons.addAccount')}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('persons.noAccounts')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {accounts.map(account => (
            <li key={account.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{account.bank}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('persons.deleteAccountAria', { bank: account.bank })}
                  onClick={() => onRemove(account)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {account.accountNumber ? (
                <p className="text-muted-foreground mt-1 text-xs tabular-nums" dir="ltr">
                  {account.accountNumber}
                </p>
              ) : null}
              {account.iban ? (
                <p className="text-muted-foreground mt-1 text-xs" dir="ltr">
                  {t('persons.iban')}: {account.iban}
                </p>
              ) : null}
              {account.cardNumber ? (
                <p className="text-muted-foreground mt-1 text-xs" dir="ltr">
                  {t('persons.cardNumber')}: {account.cardNumber}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
