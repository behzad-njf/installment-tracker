import { BadgeCheck, CalendarClock, CircleDollarSign, ReceiptText, Wallet } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/hooks/useLocale'
import { formatMoney, formatNumber } from '@/lib/money'
import type { Summary } from '@/lib/loans'

function Stat({
  label,
  value,
  toman,
  icon,
  tone,
  delay,
}: {
  label: string
  value: string
  toman: string
  icon: React.ReactNode
  tone: string
  delay: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`grid size-5 sm:size-6 md:size-8 place-items-center rounded-lg ${tone}`}>{icon}</span>
            <span className="text-muted-foreground text-xs font-medium">{label}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base sm:text-lg md:text-2xl leading-none font-bold tabular-nums`}>{value}</span>
            <span className="text-muted-foreground text-xs">{toman}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SummaryCards({
  summary,
  nextMonthAmount,
  checksIssuedThisMonth = 0,
  checksClearedThisMonth = 0,
  checksIssuedNextMonth = 0,
}: {
  summary: Summary
  nextMonthAmount: number
  checksIssuedThisMonth?: number
  checksClearedThisMonth?: number
  checksIssuedNextMonth?: number
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const toman = t('common.toman')

  return (
    <section aria-label={t('common.currentMonth')} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          delay={0}
          label={t('dashboard.totalMonthly')}
          value={formatMoney(summary.totalMonthly + checksIssuedThisMonth + checksClearedThisMonth, lang)}
          toman={toman}
          icon={<Wallet className="size-4" aria-hidden />}
          tone="bg-chart-1/12 text-chart-1"
        />
        <Stat
          delay={0.06}
          label={t('dashboard.paidThisMonth')}
          value={formatMoney(summary.paidThisMonth + checksClearedThisMonth, lang)}
          toman={toman}
          icon={<BadgeCheck className="size-4" aria-hidden />}
          tone="bg-chart-2/12 text-chart-2"
        />
        <Stat
          delay={0.12}
          label={t('dashboard.remainingThisMonth')}
          value={formatMoney(summary.remainingThisMonth + checksIssuedThisMonth, lang)}
          toman={toman}
          icon={
            summary.remainingThisMonth + checksIssuedThisMonth > 0 ? (
              <CircleDollarSign className="size-4" aria-hidden />
            ) : (
              <ReceiptText className="size-4" aria-hidden />
            )
          }
          tone="bg-chart-3/12 text-chart-3"
        />
        <Stat
          delay={0.18}
          label={t('dashboard.nextMonth')}
          value={formatMoney(nextMonthAmount + checksIssuedNextMonth, lang)}
          toman={toman}
          icon={<CalendarClock className="size-4" aria-hidden />}
          tone="bg-chart-4/12 text-chart-4"
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs">
        <span>
          <bdi>{formatNumber(summary.activeCount, lang)}</bdi> {t('common.loans')}
        </span>
        <span aria-hidden className="opacity-40">
          —
        </span>
        <span>
          {t('dashboard.paidOfActive', {
            paid: formatNumber(summary.paidCount, lang),
            active: formatNumber(summary.activeCount, lang),
          })}
        </span>
      </div>
    </section>
  )
}