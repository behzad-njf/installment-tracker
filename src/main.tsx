import './index.css'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { LoansProvider } from '@/components/loans/LoansProvider'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(
    (reg) => console.log('SW registered', reg.scope),
    (err) => console.error('SW registration failed', err)
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoansProvider>
      <App />
    </LoansProvider>
  </StrictMode>,
)