import { useEffect, useState } from 'react'

export type Route =
  | 'dashboard'
  | 'loans'
  | 'checks'
  | 'persons'
  | 'settings'
  | { kind: 'checks.book'; bookId: string }
  | { kind: 'checks.check'; bookId: string; serial: number }
  | { kind: 'persons.person'; personId: string }

const ROUTES: string[] = ['dashboard', 'loans', 'checks', 'persons', 'settings']

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const parts = raw.split('/').filter(Boolean)
  if (parts.length === 0) return 'dashboard'
  const [page, ...rest] = parts
  if (page === 'checks') {
    if (rest[0] === 'books' && rest[1]) {
      const serial = Number(rest[2])
      if (rest.length >= 3 && Number.isInteger(serial)) {
        return { kind: 'checks.check', bookId: rest[1], serial }
      }
      return { kind: 'checks.book', bookId: rest[1] }
    }
    return 'checks'
  }
  if (page === 'persons') {
    return rest[0] ? { kind: 'persons.person', personId: rest[0] } : 'persons'
  }
  return ROUTES.includes(page) ? (page as Route) : 'dashboard'
}

export function navigate(route: Route): void {
  let hash: string
  if (typeof route === 'string') hash = `#/${route}`
  else if (route.kind === 'persons.person') hash = `#/persons/${route.personId}`
  else if (route.kind === 'checks.book') hash = `#/checks/books/${route.bookId}`
  else hash = `#/checks/books/${route.bookId}/serial/${route.serial}`
  if (window.location.hash !== hash) window.location.hash = hash
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