import { useTranslation } from 'react-i18next'

import type { Route } from '@/hooks/useRoute'

import { NAV_ITEMS } from './navItems'

export function BottomNav({ route }: { route: Route }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('nav.label')}
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}
      >
        {NAV_ITEMS.map(({ route: itemRoute, labelKey, icon: Icon }) => {
          // Detail routes ('checks.book', 'persons.person') keep their section highlighted.
          const active = (typeof route === 'string' ? route : route.kind.split('.')[0]) === itemRoute
          return (
            <li key={itemRoute}>
              <a
                href={`#/${itemRoute}`}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {t(labelKey)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
