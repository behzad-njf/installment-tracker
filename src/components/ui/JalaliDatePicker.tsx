import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { Label } from '@/components/ui/label'
import {
  jalaliToDate,
  daysInJalaliMonth,
  monthName,
  currentMonthIndex,
  yearMonthOf,
  currentDay,
  monthIndexFrom,
} from '@/lib/jalali'
import { formatYear } from '@/lib/money'

interface JalaliDatePickerProps {
  label?: string
  onChange: (iso: string) => void
}

/** Minimal Jalali date picker: three native selects (day / month / year, RTL order). No date library. */
export function JalaliDatePicker({ label, onChange }: JalaliDatePickerProps) {
  const { lang } = useLocale()

  const { year: curYear, month: curMonth } = yearMonthOf(currentMonthIndex())
  const curDay = currentDay()

  const [jYear, setJYear] = useState(curYear)
  const [jMonth, setJMonth] = useState(curMonth)
  const [jDay, setJDay] = useState(curDay)

  const daysCount = daysInJalaliMonth(jYear, jMonth)
  const clampedDay = Math.min(jDay, daysCount)

  const handleChange = () => {
    const date = jalaliToDate(jYear, jMonth, clampedDay)
    onChange(date.toISOString())
  }

  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <select
          value={clampedDay}
          onChange={e => {
            setJDay(Number(e.target.value))
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent flex-1"
        >
          {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>
              {formatYear(d, lang)}
            </option>
          ))}
        </select>
        <select
          value={jMonth}
          onChange={e => {
            setJMonth(Number(e.target.value))
            setJDay(Math.min(clampedDay, daysInJalaliMonth(jYear, Number(e.target.value))))
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent flex-1"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {monthName(monthIndexFrom(jYear, m), lang)}
            </option>
          ))}
        </select>
        <select
          value={jYear}
          onChange={e => {
            setJYear(Number(e.target.value))
            setJDay(Math.min(clampedDay, daysInJalaliMonth(Number(e.target.value), jMonth)))
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-sm h-9 bg-transparent flex-1"
        >
          {Array.from({ length: 21 }, (_, i) => curYear - 10 + i).map(y => (
            <option key={y} value={y}>
              {formatYear(y, lang)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
