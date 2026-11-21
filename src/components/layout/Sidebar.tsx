import { useTranslation } from 'react-i18next'
import { WalletMinimal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import type { Route } from '@/hooks/useRoute'

import { NAV_ITEMS } from './navItems'

export function Sidebar({
  route,
  open,
  onClose,
}: {
  route: Route
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
      {open ? (
        <div
          className="bg-foreground/30 fixed inset-0 z-[45] backdrop-blur-[1px] md:hidden"
          aria-hidden
          onClick={onClose}
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label={t('nav.label')}
        className={cn(
          'bg-background fixed inset-y-0 start-0 z-50 flex w-60 flex-col border-e transition-transform duration-200 md:z-40',
          open ? 'translate-x-0' : 'max-md:-translate-x-full max-md:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b px-4">
          <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl shadow-sm">
            <WalletMinimal className="size-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{t('app.name')}</p>
            <p className="text-muted-foreground text-xs">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ route: itemRoute, labelKey, icon: Icon }) => {
              const active = (typeof route === 'string' ? route : route.kind.split('.')[0]) === itemRoute
              return (
                <li key={itemRoute}>
                  <a
                    href={`#/${itemRoute}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={onClose}
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

        <p className="text-muted-foreground border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-[11px] md:pb-3">
          {t('app.version', { version: APP_VERSION })}
        </p>
      </aside>
    </>
  )
}
