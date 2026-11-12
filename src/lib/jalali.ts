import type { Lang, MonthIndex } from './types'
import { formatNumber, formatYear } from './money'

export const MONTH_NAMES: Record<Lang, readonly string[]> = {
  fa: [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ],
  en: [
    'Farvardin',
    'Ordibehesht',
    'Khordad',
    'Tir',
    'Mordad',
    'Shahrivar',
    'Mehr',
    'Aban',
    'Azar',
    'Dey',
    'Bahman',
    'Esfand',
  ],
}

/** Latin-digit Jalali calendar parts, for date math without a date library. */
const PERSIAN_PARTS = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
})

export function monthIndexFrom(year: number, month: number): MonthIndex {
  return year * 12 + (month - 1)
}

export function yearMonthOf(index: MonthIndex): { year: number; month: number } {
  const year = Math.floor(index / 12)
  return { year, month: index - year * 12 + 1 }
}

export function currentMonthIndex(date: Date = new Date()): MonthIndex {
  const parts = PERSIAN_PARTS.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return monthIndexFrom(year, month)
}

export function monthName(index: MonthIndex, lang: Lang): string {
  return MONTH_NAMES[lang][yearMonthOf(index).month - 1]
}

/** e.g. «آبان ۱۴۰۵» / "Aban 1405". */
export function monthLabel(index: MonthIndex, lang: Lang, formatYear: (year: number) => string): string {
  const { year } = yearMonthOf(index)
  return `${monthName(index, lang)} ${formatYear(year)}`
}

export function monthsOfYear(year: number): MonthIndex[] {
  return Array.from({ length: 12 }, (_, i) => monthIndexFrom(year, i + 1))
}

/** Clamp anything to a valid 1..12 month number. */
export function clampMonth(month: number): number {
  return Math.min(12, Math.max(1, Math.round(month)))
}

/** Current day of month in Jalali calendar. */
const PERSIAN_DAY_PARTS = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  day: 'numeric',
})

export function currentDay(): number {
  const parts = PERSIAN_DAY_PARTS.formatToParts(new Date())
  return Number(parts.find((part) => part.type === 'day')?.value)
}

/** Day-of-week names indexed by JS `Date.getDay()` (0 = Sunday). */
export const WEEKDAY_NAMES: Record<Lang, readonly string[]> = {
  fa: ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعہ', 'شنبه'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

/** Full Jalali date with weekday, e.g. «دوشنبه ۲۱ آبان ۱۴۰۵». */
export function todayLabel(lang: Lang): string {
  const now = new Date()
  const weekday = WEEKDAY_NAMES[lang][now.getDay()]
  const { year, month } = yearMonthOf(currentMonthIndex())
  const day = currentDay()
  return `${weekday} ${formatNumber(day, lang)} ${monthName(monthIndexFrom(year, month), lang)} ${formatYear(year, lang)}`
}

/** Days until the deadline day (within current month). Negative means overdue. */
export function daysUntilDeadline(deadlineDay: number): number {
  return deadlineDay - currentDay()
}
