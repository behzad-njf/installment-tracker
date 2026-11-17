import { LayoutDashboard, ScrollText, UsersRound, WalletMinimal, type LucideIcon } from 'lucide-react'

export interface NavItem {
  route: 'dashboard' | 'loans' | 'checks' | 'persons'
  labelKey: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { route: 'loans', labelKey: 'nav.loans', icon: WalletMinimal },
  { route: 'checks', labelKey: 'nav.checks', icon: ScrollText },
  { route: 'persons', labelKey: 'nav.persons', icon: UsersRound },
]
