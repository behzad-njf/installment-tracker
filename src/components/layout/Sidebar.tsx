import { useTranslation } from 'react-i18next'
import { WalletMinimal } from 'lucide-react'

import { APP_VERSION } from '@/lib/version'
import type { Route } from '@/hooks/useRoute'

import { NAV_ITEMS } from './navItems'

export function Sidebar({ route }: { route: Route }) {
  const { t } = useTranslation()

  return (
    <aside className="bg-background fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b px-4">
        <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl shadow-sm">
          <WalletMinimal className="size-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{t('app.name')}</p>
          <p className="text-muted-foreground text-xs">{t('app.tagline')}</p>
        </div>
      </div>

      <nav aria-label={t('nav.label')} className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ route: itemRoute, labelKey, icon: Icon }) => {
            const active = route === itemRoute
            return (
              <li key={itemRoute}>
                <a
                  href={`#/${itemRoute}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(labelKey)}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <p className="text-muted-foreground border-t px-4 py-3 text-[11px]">
        {t('app.version', { version: APP_VERSION })}
      </p>
    </aside>
  )
}
