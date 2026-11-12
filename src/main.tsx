import './index.css'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { LoansProvider } from '@/components/loans/LoansProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoansProvider>
      <App />
    </LoansProvider>
  </StrictMode>,
)