import { useEffect, useState } from 'react'

export type Route = 'dashboard' | 'loans' | 'checks'

const ROUTES: Route[] = ['dashboard', 'loans', 'checks']

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.includes(raw as Route) ? (raw as Route) : 'dashboard'
}

export function navigate(route: Route): void {
  if (window.location.hash !== `#/${route}`) window.location.hash = `#/${route}`
}

/** Minimal hash router: back/forward buttons work, no dependency needed. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    if (!window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/dashboard`)
    }
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}
