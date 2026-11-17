import { UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PersonsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.persons')}</h1>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-14 text-center">
        <UsersRound className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm font-medium">{t('persons.emptyTitle')}</p>
        <p className="text-muted-foreground text-xs">{t('persons.emptyDesc')}</p>
      </div>
    </div>
  )
}
