import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { currentMonthIndex, monthName } from '@/lib/jalali'
import { formatMoney, formatNumber } from '@/lib/money'
import { personsFlowByMonth } from '@/lib/persons'
import { useLocale } from '@/hooks/useLocale'
import { Card, CardContent } from '@/components/ui/card'
import type { PersonTxn } from '@/lib/types'

interface Props {
  txns: PersonTxn[]
  months?: number
}

export function PersonsFlowChart({ txns, months = 6 }: Props) {
  const { t } = useTranslation()
  const { lang, dir } = useLocale()

  const data = useMemo(
    () =>
      personsFlowByMonth(txns, currentMonthIndex(), months).map(bucket => ({
        ...bucket,
        label: monthName(bucket.monthIdx, lang),
      })),
    [txns, months, lang],
  )

  const series = [
    { key: 'receivable', name: t('persons.flowReceivable'), color: 'var(--chart-2)' },
    { key: 'payable', name: t('persons.flowPayable'), color: 'var(--chart-4)' },
    { key: 'net', name: t('persons.flowNet'), color: 'var(--chart-1)' },
  ] as const

  const axisFormatter = (value: number) =>
    Math.abs(value) >= 1_000_000
      ? `${formatNumber(value / 1_000_000, lang, 1)}M`
      : formatNumber(value, lang)

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-sm font-semibold">{t('persons.flowTitle')}</p>
        <p className="text-muted-foreground text-xs">{t('persons.flowHint', { count: months })}</p>
        <div className="mt-2 w-full min-w-0" dir="ltr">
          <ResponsiveContainer width="100%" height={224} minWidth={0}>
            <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                reversed={dir === 'rtl'}
                interval={0}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} width={52} tickFormatter={axisFormatter} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as {
                    label: string
                    receivable: number
                    payable: number
                    net: number
                  }
                  return (
                    <div className="bg-background rounded border p-2 text-xs">
                      <div className="mb-1 font-semibold">{row.label}</div>
                      {series.map(s => (
                        <div key={s.key} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full" style={{ background: s.color }} />
                            {s.name}
                          </span>
                          <span className="tabular-nums">{formatMoney(row[s.key], lang)}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
              {series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
