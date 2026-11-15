import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { currentMonthIndex, daysInJalaliMonth, jalaliPartsFromDate, monthName, yearMonthOf } from '@/lib/jalali'
import { formatNumber, formatYear, parseMoney } from '@/lib/money'
import { useLoans } from '@/hooks/useLoans'
import type { Lang } from '@/lib/types'

type Step = 1 | 2 | 3

const issueGreen =
  'bg-green-100 text-green-900 border-green-300 hover:bg-green-200 focus-visible:ring-2 focus-visible:ring-green-500'

function monthIndexFrom(year: number, month: number): number {
  return year * 12 + (month - 1)
}

export function IssueCheckDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const { checkbooks, checks, setCheckStatus } = useLoans()
  const [step, setStep] = useState<Step>(1)
  const [bookId, setBookId] = useState<string>(checkbooks[0]?.id ?? '')
  const [selectedCheckId, setSelectedCheckId] = useState<string>('')
  const [error, setError] = useState('')

  // Step 2 fields
  const [payee, setPayee] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [purpose, setPurpose] = useState('')
  const cur = yearMonthOf(currentMonthIndex())
  const today = jalaliPartsFromDate(new Date())
  const [dueYear, setDueYear] = useState(String(cur.year))
  const [dueMonth, setDueMonth] = useState(String(cur.month))
  const [dueDay, setDueDay] = useState(String(today.day))

  const book = checkbooks.find(b => b.id === bookId)
  const blankChecks = book
    ? checks
        .filter(c => c.checkbookId === bookId && c.status === 'blank')
        .sort((a, b) => (a.serial ?? 0) - (b.serial ?? 0))
    : []
  const selectedCheck = checks.find(c => c.id === selectedCheckId)

  useEffect(() => {
    if (step !== 1 || !bookId || selectedCheckId) return
    if (blankChecks.length > 0) setSelectedCheckId(blankChecks[0].id)
  }, [bookId, step, selectedCheckId, blankChecks.length])

  const goStep2 = () => {
    if (!selectedCheckId) {
      setError(t('checks.selectBlankCheck'))
      return
    }
    setStep(2)
    setError('')
  }

  const goPreview = () => {
    const amount = parseMoney(amountRaw)
    const payeeTrim = payee.trim()
    const purposeTrim = purpose.trim()
    const y = Number(dueYear)
    const m = Number(dueMonth)
    const d = Number(dueDay)
    if (!payeeTrim || amount <= 0) {
      setError(t('checks.payeeAmountRequired'))
      return
    }
    if (!purposeTrim) {
      setError(t('checks.purposeRequired'))
      return
    }
    if (!Number.isInteger(y) || y < 1300 || y > 1500) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(d) || d < 1 || d > daysInJalaliMonth(y, m)) {
      setError(t('checks.dueInvalid'))
      return
    }
    setError('')
    setStep(3)
  }

  const handleIssue = () => {
    if (!selectedCheck) return
    setCheckStatus(selectedCheck.id, 'issued', {
      payee: payee.trim(),
      amount: parseMoney(amountRaw),
      purpose: purpose.trim(),
      dueYear: Number(dueYear),
      dueMonth: Number(dueMonth),
      dueDay: Number(dueDay),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('checks.issueCheck')}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <form className="space-y-3">
              <Label htmlFor="issue-book">{t('checks.selectCheckbook')}</Label>
              <Select
                value={bookId}
                onValueChange={value => {
                  setBookId(value)
                  setSelectedCheckId('')
                }}
              >
                <SelectTrigger id="issue-book" className="w-full">
                  <SelectValue placeholder={t('checks.unassigned')} />
                </SelectTrigger>
                <SelectContent>
                  {checkbooks.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </form>

            {book ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-2">
                  <Label className="text-sm font-medium">{t('checks.selectBlankCheck')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {t('checks.remaining', { count: String(blankChecks.length) })}
                  </span>
                </div>
                {blankChecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('checks.empty')}</p>
                ) : (
                  <div className="overflow-y-auto max-h-48 rounded-md border border-input p-2 space-y-1">
                    {blankChecks.map(c => {
                      const isSelected = c.id === selectedCheckId
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCheckId(c.id)}
                          className={`w-full text-start rounded-md border px-3 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'bg-green-100 border-green-400 text-green-900 ring-1 ring-green-500'
                              : 'border-input text-muted-foreground hover:bg-accent hover:text-muted-foreground'
                          }`}
                        >
                          {t('checks.serial')} {c.serial}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={goStep2} disabled={!selectedCheckId}>
                {t('common.next')} <ChevronRight className="size-4 ml-1" aria-hidden />
              </Button>
            </DialogFooter>
          </>
        ) : step === 2 ? (
          <>
            <form id="issue-check-form" onSubmit={e => e.preventDefault()} className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <Plus className="size-3" aria-hidden />
                <span>{t('checks.checkbook')} {book?.bank}</span>
                <span className="w-px bg-border"></span>
                <span>{t('checks.serial')} {selectedCheck?.serial}</span>
              </div>
              <Label htmlFor="issue-payee">{t('checks.payee')}</Label>
              <Input
                id="issue-payee"
                name="issue-payee"
                value={payee}
                onChange={e => setPayee(e.target.value)}
                maxLength={80}
              />
              <Label htmlFor="issue-amount">{t('checks.amount')} ({t('common.toman')})</Label>
              <Input
                id="issue-amount"
                name="issue-amount"
                type="text"
                inputMode="numeric"
                value={amountRaw}
                onChange={e => setAmountRaw(e.target.value.replace(/\D/g, ''))}
              />
              <Label htmlFor="issue-purpose">{t('checks.purpose')}</Label>
              <Input
                id="issue-purpose"
                name="issue-purpose"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                maxLength={120}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="issue-day">{t('common.day')}</Label>
                  <Input
                    id="issue-day"
                    name="issue-day"
                    type="number"
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    min={1}
                    max={31}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="issue-month">{t('loans.month')}</Label>
                  <Input
                    id="issue-month"
                    name="issue-month"
                    type="number"
                    value={dueMonth}
                    onChange={e => setDueMonth(e.target.value)}
                    min={1}
                    max={12}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="issue-year">{t('loans.year')}</Label>
                  <Input
                    id="issue-year"
                    name="issue-year"
                    type="number"
                    value={dueYear}
                    onChange={e => setDueYear(e.target.value)}
                    min={1300}
                    max={1500}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronRight className="size-4 rotate-180 mr-1" aria-hidden /> {t('common.back')}
              </Button>
              <Button type="button" className={issueGreen} onClick={goPreview} disabled={!payee.trim() || !amountRaw}>
                {t('checks.action.issued')} <ChevronRight className="size-4 ml-1" aria-hidden />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <Label className="text-sm font-medium">{t('checks.selectCheckbook')}</Label>
                <span className="text-xs text-muted-foreground">
                  {book?.bank}{book?.accountNumber ? ` · ${book.accountNumber}` : ''}
                </span>
              </div>
              <div className="grid gap-1 text-sm">
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.serial')}</span>
                  <span dir="ltr">{selectedCheck?.serial}</span>
                </div>
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.payee')}</span>
                  <span>{payee}</span>
                </div>
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.amount')}</span>
                  <span dir="ltr">{formatNumber(parseMoney(amountRaw), lang)} {t('common.toman')}</span>
                </div>
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.purpose')}</span>
                  <span>{purpose}</span>
                </div>
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.dueDate')}</span>
                  <span>
                    {formatNumber(Number(dueDay), lang)} {monthName(monthIndexFrom(Number(dueYear), Number(dueMonth)), lang)} {formatYear(Number(dueYear), lang)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-input pb-1">
                  <span className="text-muted-foreground">{t('checks.statusLabel')}</span>
                  <span className="text-green-700">{t('checks.status.issued')}</span>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronRight className="size-4 rotate-180 mr-1" aria-hidden /> {t('common.back')}
              </Button>
              <Button type="button" className={issueGreen} onClick={handleIssue}>
                {t('checks.confirmIssue')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
