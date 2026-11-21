import {
  LayoutDashboard,
  ScrollText,
  Settings,
  UsersRound,
  WalletMinimal,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  route: 'dashboard' | 'loans' | 'checks' | 'persons' | 'settings'
  labelKey: string
  icon: LucideIcon
  /** Bottom bar stays at four primary sections; settings lives in the sidebar. */
  hideInBottomNav?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { route: 'loans', labelKey: 'nav.loans', icon: WalletMinimal },
  { route: 'checks', labelKey: 'nav.checks', icon: ScrollText },
  { route: 'persons', labelKey: 'nav.persons', icon: UsersRound },
  { route: 'settings', labelKey: 'nav.settings', icon: Settings, hideInBottomNav: true },
]

export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter(item => !item.hideInBottomNav)
