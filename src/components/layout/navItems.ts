import { LayoutDashboard, ScrollText, WalletMinimal, type LucideIcon } from 'lucide-react'

import type { Route } from '@/hooks/useRoute'

export interface NavItem {
  route: Route
  labelKey: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { route: 'loans', labelKey: 'nav.loans', icon: WalletMinimal },
  { route: 'checks', labelKey: 'nav.checks', icon: ScrollText },
]
