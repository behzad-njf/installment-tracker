import { useContext } from 'react'
import { LoansContext } from '@/components/loans/LoansProvider'

export function useLoans() {
  const ctx = useContext(LoansContext)
  if (!ctx) throw new Error('useLoans must be used inside LoansProvider')
  return ctx
}