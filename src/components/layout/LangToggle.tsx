import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocale } from '@/hooks/useLocale'

export function LangToggle() {
  const { t } = useTranslation()
  const { lang, toggleLang } = useLocale()
  const next = lang === 'fa' ? 'English' : 'فارسی'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="default" onClick={toggleLang} aria-label={t('common.switchTo', { lang: next })}>
          <Languages aria-hidden />
          <span className="font-medium">{lang === 'fa' ? 'EN' : 'فا'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('common.switchTo', { lang: next })}</TooltipContent>
    </Tooltip>
  )
}
