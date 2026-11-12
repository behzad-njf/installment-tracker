import { useTranslation } from 'react-i18next'
import { useLoans } from '@/hooks/useLoans'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  const { t } = useTranslation()
  const { addLoan } = useLoans()

  return (
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground">{t('loans.noLoans')}</p>
      <Button type="button" variant="outline" onClick={() => addLoan({ name: '', amount: 0, startYear: 1400, startMonth: 1, duration: 1, payments: [] })}>
        {t('loans.addDemoLoan')}
      </Button>
    </div>
  )
}