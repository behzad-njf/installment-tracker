import { memo, useRef } from 'react'
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

interface JalaliDatePickerProps {
  label?: string
  onChange: (iso: string) => void
}

/** Minimal Jalali date picker: text input for day and year, select for month. No date library.
 *  Day/year are uncontrolled text inputs so nothing can close on re-render. */
export const JalaliDatePicker = memo(function JalaliDatePicker({ label, onChange }: JalaliDatePickerProps) {
  const { lang } = useLocale()

  const { year: curYear, month: curMonth } = yearMonthOf(currentMonthIndex())
  const curDay = currentDay()

  const yearRef = useRef(curYear)
  const monthRef = useRef(curMonth)
  const dayRef = useRef(curDay)

  const daysInMonth = () => daysInJalaliMonth(yearRef.current, monthRef.current)

  const clampDay = () => {
    dayRef.current = Math.min(dayRef.current, daysInMonth())
  }

  const handleChange = () => {
    clampDay()
    const date = jalaliToDate(yearRef.current, monthRef.current, dayRef.current)
    onChange(date.toISOString())
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const setDay = (v: number) => {
    if (Number.isFinite(v) && v > 0) dayRef.current = v
  }

  const setYear = (v: number) => {
    if (Number.isFinite(v) && v > 0) yearRef.current = v
  }

  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <input
          type="text"
          defaultValue={String(dayRef.current)}
          onChange={e => {
            setDay(Number(e.target.value))
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-base sm:text-sm bg-transparent h-11 sm:h-9 w-[70px] sm:w-[64px]"
        />
        <select
          value={String(monthRef.current)}
          onChange={e => {
            const m = Number(e.target.value)
            monthRef.current = m
            clampDay()
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-base sm:text-sm bg-transparent h-11 sm:h-9 w-[86px] sm:w-[80px]"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {monthName(monthIndexFrom(yearRef.current, m), lang)}
            </option>
          ))}
        </select>
        <input
          type="text"
          defaultValue={String(yearRef.current)}
          onChange={e => {
            setYear(Number(e.target.value))
            handleChange()
          }}
          className="border border-border rounded-lg px-3 py-2 text-base sm:text-sm bg-transparent h-11 sm:h-9 w-[70px] sm:w-[64px]"
        />
      </div>
    </div>
  )
})
