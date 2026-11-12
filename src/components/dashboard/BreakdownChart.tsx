import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts'

import { summaryFor } from '@/lib/loans'
import { monthIndexFrom, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import { useLocale } from '@/hooks/useLocale'
import type { Loan } from '@/lib/types'

interface Props {
  loans: Loan[]
  year: number
}

export function BreakdownChart({ loans, year }: Props) {
  const { t } = useTranslation()
  const { lang, dir } = useLocale()

  const data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthIdx = monthIndexFrom(year, i + 1)
      const summary = summaryFor(loans, monthIdx)
      return {
        monthIdx,
        month: monthName(monthIdx, lang),
        paid: summary.paidThisMonth,
        remaining: summary.remainingThisMonth,
        total: summary.totalMonthly,
      }
    })
  }, [loans, year, lang])

  const axisFormatter = (value: number) =>
    value >= 1_000_000
      ? `${formatNumber(value / 1_000_000, lang, 1)}M`
      : formatNumber(value, lang)

  const monthDateFormatter = (monthIdx: number) => {
    return monthName(monthIdx, lang)
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="monthIdx"
            reversed={dir === 'rtl'}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={monthDateFormatter}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={48}
            domain={['auto', 'auto']}
            tickFormatter={axisFormatter}
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const entry = payload[0].payload as {
                month: string
                paid: number
                remaining: number
                total: number
              }
              const label = t('dashboard.breakdown.month', {
                month: entry.month,
                paid: formatMoney(entry.paid, lang),
                remaining: formatMoney(entry.remaining, lang),
                total: formatMoney(entry.total, lang),
              })
              return (
                <div className="bg-background p-1 border border-border rounded text-xs">
                  <div className="font-semibold">{label}</div>
                </div>
              )
            }}
          />
          <Legend />
          <Bar dataKey="paid" stackId="a" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name={t('loans.status.paid')}>
            {data.map((_, i) => (
              <Cell key={`paid-${i}`} fill="var(--chart-1)" />
            ))}
          </Bar>
          <Bar
            dataKey="remaining"
            stackId="a"
            fill="var(--chart-2)"
            radius={[0, 0, 4, 4]}
            name={t('loans.status.unpaid')}
          >
            {data.map((_, i) => (
              <Cell key={`remaining-${i}`} fill="var(--chart-2)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
