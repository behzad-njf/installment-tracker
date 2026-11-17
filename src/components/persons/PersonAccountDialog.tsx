import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PersonAccount, PersonAccountDraft } from '@/lib/types'

export function PersonAccountDialog({
  account,
  personName,
  open,
  onOpenChange,
  onSave,
}: {
  account: PersonAccount | null
  personName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: PersonAccountDraft) => void
}) {
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    onSave({
      bank: field('bank'),
      accountNumber: field('accountNumber') || undefined,
      iban: field('iban') || undefined,
      cardNumber: field('cardNumber') || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{t('persons.addAccount')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{personName}</p>
          <Label htmlFor="account-bank">{t('persons.bank')}</Label>
          <Input
            id="account-bank"
            name="bank"
            defaultValue={account?.bank ?? ''}
            maxLength={40}
            required
            autoFocus
          />
          <Label htmlFor="account-number">{t('persons.accountNumber')}</Label>
          <Input
            id="account-number"
            name="accountNumber"
            inputMode="numeric"
            dir="ltr"
            defaultValue={account?.accountNumber ?? ''}
            maxLength={40}
          />
          <Label htmlFor="account-iban">{t('persons.iban')}</Label>
          <Input id="account-iban" name="iban" dir="ltr" defaultValue={account?.iban ?? ''} maxLength={40} />
          <Label htmlFor="account-card">{t('persons.cardNumber')}</Label>
          <Input
            id="account-card"
            name="cardNumber"
            inputMode="numeric"
            dir="ltr"
            defaultValue={account?.cardNumber ?? ''}
            maxLength={30}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
