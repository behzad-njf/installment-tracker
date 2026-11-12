import { WalletMinimal } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { TooltipProvider } from '@/components/ui/tooltip'

import { LangToggle } from './LangToggle'
import { MonthChip } from './MonthChip'
import { ThemeToggle } from './ThemeToggle'

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-background">
        <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl shadow-sm">
                <WalletMinimal className="size-5" aria-hidden />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{t('app.name')}</p>
                <p className="text-muted-foreground text-xs">{t('app.tagline')}</p>
              </div>
            </div>

            <div className="ms-auto flex items-center gap-1.5">
              <MonthChip />
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</main>
      </div>
    </TooltipProvider>
  )
}
