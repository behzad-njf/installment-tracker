import { useEffect, useRef, useState, type ReactElement } from 'react'

import { UpdateDialog } from '@/components/dashboard/UpdateDialog'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { useRoute } from '@/hooks/useRoute'
import { warmUp } from '@/lib/googleDrive'
import { APP_VERSION } from '@/lib/version'
import { ChecksPage } from '@/pages/ChecksPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoansPage } from '@/pages/LoansPage'
import { PersonsPage } from '@/pages/PersonsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CheckbookDetailPage } from '@/components/checks/CheckbookDetailPage'
import { CheckDetailPage } from '@/components/checks/CheckDetailPage'
import { PersonDetailPage } from '@/components/persons/PersonDetailPage'

export function App() {
  const route = useRoute()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateVersion, setUpdateVersion] = useState('')
  const [reloading, setReloading] = useState(false)
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  // Keep a previously connected Google Drive session alive without any click.
  useEffect(() => {
    warmUp()
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // The new version number only exists in the deployed build — read it from version.json.
    // ponytail: if a worker was already waiting from an older deploy, this can show a newer
    // version than the one about to activate. Add a per-worker version channel when it matters.
    const markUpdate = () => {
      setUpdateAvailable(true)
      fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { version?: string } | null) => {
          if (data?.version) setUpdateVersion(data.version)
        })
        .catch(() => {
          /* offline — dialog falls back to "new version ready" */
        })
    }

    navigator.serviceWorker.ready.then((registration) => {
      swRegRef.current = registration

      // Check if there's already a waiting worker (update already downloaded)
      if (registration.waiting) {
        markUpdate()
        return
      }

      // Check for updates on load
      registration.update()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            markUpdate()
            swRegRef.current = registration
          }
        })
      })
    })

    const onControllerChange = () => {
      setReloading(true)
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  let page: ReactElement | null
  if (typeof route === 'string') {
    page = route === 'loans'
      ? <LoansPage />
      : route === 'checks'
        ? <ChecksPage />
        : route === 'persons'
          ? <PersonsPage />
          : route === 'settings'
            ? <SettingsPage />
            : <DashboardPage />
  } else if (route.kind === 'checks.book') {
    page = <CheckbookDetailPage bookId={route.bookId} />
  } else if (route.kind === 'checks.check') {
    page = <CheckDetailPage bookId={route.bookId} serial={route.serial} />
  } else if (route.kind === 'persons.person') {
    page = <PersonDetailPage personId={route.personId} />
  } else {
    page = <DashboardPage />
  }

  return (
    <AppShell route={route}>
      <Toaster />
      {page}
      {updateAvailable && (
        <UpdateDialog
          open={updateAvailable && !reloading}
          currentVersion={APP_VERSION}
          newVersion={updateVersion}
          onOpenChange={open => {
            if (!open) {
              setUpdateAvailable(false)
              setReloading(false)
            }
          }}
          onUpdate={() => {
            swRegRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' })
          }}
        />
      )}
    </AppShell>
  )
}
