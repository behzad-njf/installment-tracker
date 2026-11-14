import { useEffect, useRef, useState } from 'react'

import { UpdateDialog } from '@/components/dashboard/UpdateDialog'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { useRoute } from '@/hooks/useRoute'
import { APP_VERSION } from '@/lib/version'
import { ChecksPage } from '@/pages/ChecksPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoansPage } from '@/pages/LoansPage'

export function App() {
  const route = useRoute()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateVersion, setUpdateVersion] = useState('')
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((registration) => {
      swRegRef.current = registration

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
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return (
    <AppShell route={route}>
      <Toaster />
      {route === 'loans' ? <LoansPage /> : route === 'checks' ? <ChecksPage /> : <DashboardPage />}
      {updateAvailable && (
        <UpdateDialog
          open={updateAvailable}
          currentVersion={APP_VERSION}
          newVersion={updateVersion}
          onOpenChange={open => setUpdateAvailable(open)}
          onUpdate={() => {
            swRegRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' })
            setUpdateAvailable(false)
          }}
        />
      )}
    </AppShell>
  )
}
