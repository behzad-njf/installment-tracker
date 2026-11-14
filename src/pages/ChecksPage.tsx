import { useTranslation } from 'react-i18next'
import { ScrollText } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export function ChecksPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t('nav.checks')}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ScrollText className="text-muted-foreground size-8" aria-hidden />
          <p className="text-muted-foreground text-sm">{t('checks.comingSoon')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
