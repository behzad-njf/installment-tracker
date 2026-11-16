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

/** Jalali date of `deadlineDay` within `month`, clamped to a valid day. */
export function deadlineDateOf(deadlineDay: number, month: MonthIndex): {
  year: number
  month: number
  day: number
} {
  const { year, month: m } = yearMonthOf(month)
  const maxDay = daysInJalaliMonth(year, m)
  const day = Math.min(Math.max(deadlineDay, 1), maxDay)
  return { year, month: m, day }
}

/** Full Jalali parts formatter (year, month, day as Latin digits). */
export const PERSIAN_FULL_PARTS = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

/** Convert Jalali (year, month, day) to a JS Date (UTC midnight). Brute-force search ±2 years around the approximate Gregorian year. */
export function jalaliToDate(jYear: number, jMonth: number, jDay: number): Date {
  let gYear = jYear + 621
  let date = new Date(Date.UTC(gYear - 1, 0, 1))
  const end = new Date(Date.UTC(gYear + 1, 11, 31))
  while (date <= end) {
    const parts = PERSIAN_FULL_PARTS.formatToParts(date)
    const y = Number(parts.find((part) => part.type === 'year')?.value)
    const m = Number(parts.find((part) => part.type === 'month')?.value)
    const d = Number(parts.find((part) => part.type === 'day')?.value)
    if (y === jYear && m === jMonth && d === jDay) {
      return new Date(date)
    }
    date = new Date(date.getTime() + 86400000)
  }
  return new Date(Date.UTC(gYear, 2, 21))
}

/** Extract Jalali year/month/day from a JS Date. */
export function jalaliPartsFromDate(date: Date): { year: number; month: number; day: number } {
  const parts = PERSIAN_FULL_PARTS.formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  }
}

/** Number of days in a Jalali month (Esfand is 29 or 30 by the 33-year leap rule). */
export function daysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  const r = year % 33
  const leap = r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30
  return leap ? 30 : 29
}
