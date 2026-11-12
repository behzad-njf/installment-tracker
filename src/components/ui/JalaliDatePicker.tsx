import { memo, useState, useRef } from 'react'
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

/** Minimal Jalali date picker: three native selects (day / month / year, RTL order). No date library.
 *  Each select uses `size` so options show inline with vertical scroll instead of a popup
 *  that can close on re-render. */
export const JalaliDatePicker = memo(function JalaliDatePicker({ label, onChange }: JalaliDatePickerProps) {
  const { lang } = useLocale()

  const { year: curYear, month: curMonth } = yearMonthOf(currentMonthIndex())
  const curDay = currentDay()

  const yearRef = useRef(curYear)
  const monthRef = useRef(curMonth)
  const dayRef = useRef(curDay)
  const [daysCount, setDaysCount] = useState(daysInJalaliMonth(curYear, curMonth))

  const handleChange = () => {
    const date = jalaliToDate(yearRef.current, monthRef.current, Math.min(dayRef.current, daysCount))
    onChange(date.toISOString())
  }

  const days = Array.from({ length: daysCount }, (_, i) => i + 1)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from({ length: 21 }, (_, i) => curYear - 10 + i)

  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <select
          size={Math.min(6, daysCount)}
          value={String(dayRef.current)}
          onChange={e => {
            dayRef.current = Number(e.target.value)
            handleChange()
          }}
          className="border border-border rounded-lg px-3 text-sm bg-transparent flex-1 min-h-[96px] max-h-[96px] overflow-y-auto"
        >
          {days.map(d => (
            <option key={d} value={d}>
              {formatYear(d, lang)}
            </option>
          ))}
        </select>
        <select
          size={4}
          value={String(monthRef.current)}
          onChange={e => {
            const m = Number(e.target.value)
            monthRef.current = m
            const dc = daysInJalaliMonth(yearRef.current, m)
            setDaysCount(dc)
            dayRef.current = Math.min(dayRef.current, dc)
            handleChange()
          }}
          className="border border-border rounded-lg px-3 text-sm bg-transparent flex-1 min-h-[96px] max-h-[96px] overflow-y-auto"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {monthName(monthIndexFrom(yearRef.current, m), lang)}
            </option>
          ))}
        </select>
        <select
          size={5}
          value={String(yearRef.current)}
          onChange={e => {
            const y = Number(e.target.value)
            yearRef.current = y
            const dc = daysInJalaliMonth(y, monthRef.current)
            setDaysCount(dc)
            dayRef.current = Math.min(dayRef.current, dc)
            handleChange()
          }}
          className="border border-border rounded-lg px-3 text-sm bg-transparent flex-1 min-h-[96px] max-h-[96px] overflow-y-auto"
        >
          {years.map(y => (
            <option key={y} value={y}>
              {formatYear(y, lang)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
})
