import { useTranslation } from 'react-i18next'
import { useLoans } from '@/hooks/useLoans'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { Loan } from '@/lib/types'

interface Props {
  loan: Loan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteLoanDialog({ loan, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { removeLoan } = useLoans()

  const onConfirm = () => {
    if (loan) {
      removeLoan(loan.id)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('loans.deleteTitle')}</DialogTitle>
          <DialogDescription>{loan ? loan.name : ''}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('loans.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {t('loans.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}