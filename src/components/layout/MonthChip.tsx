import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLocale } from '@/hooks/useLocale'
import { todayLabel } from '@/lib/jalali'

/** Current Jalali date with weekday, localized — the dashboard's anchor for "today". */
export function MonthChip() {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const label = todayLabel(lang)

  return (
    <span className="text-muted-foreground hidden items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium sm:inline-flex">
      <CalendarDays className="size-3.5" aria-hidden />
      <span className="sr-only">{t('common.currentMonth')}:</span>
      {label}
    </span>
  )
}
