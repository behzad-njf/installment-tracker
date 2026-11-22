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

    navigator.serviceWorker.ready.then((registration) => {
      swRegRef.current = registration

      // Check if there's already a waiting worker (update already downloaded)
      if (registration.waiting) {
        setUpdateAvailable(true)
        setUpdateVersion(APP_VERSION)
        return
      }

      // Check for updates on load
      registration.update()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            setUpdateAvailable(true)
            setUpdateVersion(APP_VERSION)
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
