import type { Lang } from './types'

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function toFaDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)])
}

/** Persian/Arabic-Indic digits → ASCII, so input and stored text can be parsed. */
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (digit) => {
    const fa = FA_DIGITS.indexOf(digit)
    return String(fa >= 0 ? fa : AR_DIGITS.indexOf(digit))
  })
}

/** Grouped number in the active locale; `fa` yields Persian digits and the ٬ separator. */
export function formatNumber(value: number, lang: Lang, maxFractionDigits = 0): string {
  if (!Number.isFinite(value)) return formatNumber(0, lang, maxFractionDigits)
  return new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

/** Years are never grouped: «۱۴۰۵», not «۱٬۴۰۵». */
export function formatYear(year: number, lang: Lang): string {
  return lang === 'fa' ? toFaDigits(String(year)) : String(year)
}

/** Money without the currency word — callers append `t('common.toman')`. */
export function formatMoney(value: number, lang: Lang): string {
  return formatNumber(value, lang)
}

/** Lenient parse: accepts «۱٬۲۳۴٬۵۶۷», "1,234,567", " 1234567 تومان ". */
export function parseMoney(input: string): number {
  const cleaned = normalizeDigits(input)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '')
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : 0
}
