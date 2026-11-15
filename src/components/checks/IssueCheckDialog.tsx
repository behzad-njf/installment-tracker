import { useState } from 'react'
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
import { currentMonthIndex, daysInJalaliMonth, jalaliPartsFromDate, yearMonthOf } from '@/lib/jalali'
import { useLoans } from '@/hooks/useLoans'

type Step = 1 | 2

export function IssueCheckDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { checkbooks, checks, setCheckStatus } = useLoans()
  const [step, setStep] = useState<Step>(1)
  const [bookId, setBookId] = useState<string>('')
  const [selectedCheckId, setSelectedCheckId] = useState<string>('')
  const [error, setError] = useState('')

  const cur = yearMonthOf(currentMonthIndex())
  const today = jalaliPartsFromDate(new Date())

  const book = checkbooks.find(b => b.id === bookId)
  const blankChecks = book
    ? checks
        .filter(c => c.checkbookId === bookId && c.status === 'blank')
        .sort((a, b) => (a.serial ?? 0) - (b.serial ?? 0))
    : []
  const selectedCheck = checks.find(c => c.id === selectedCheckId)

  const selectFirstBlank = () => {
    if (blankChecks.length > 0) setSelectedCheckId(blankChecks[0].id)
  }

  // Auto-select the first blank check whenever the book or blank list changes.
  if (step === 1 && blankChecks.length > 0 && !selectedCheckId) {
    selectFirstBlank()
  }

  const goStep2 = () => {
    if (!selectedCheckId) {
      setError(t('checks.selectBlankCheck'))
      return
    }
    setStep(2)
    setError('')
  }

  const handleIssue = () => {
    if (!selectedCheck) return
    const form = document.getElementById('issue-check-form') as HTMLFormElement | null
    if (!form) return
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const payee = field('issue-payee')
    const amount = Number(field('issue-amount'))
    const purpose = field('issue-purpose')
    const dueYear = Number(field('issue-year'))
    const dueMonth = Number(field('issue-month'))
    const dueDay = Number(field('issue-day'))

    if (!payee || !Number.isFinite(amount) || amount <= 0) {
      setError(t('checks.payeeAmountRequired'))
      return
    }
    if (!purpose) {
      setError(t('checks.purposeRequired'))
      return
    }
    if (!Number.isInteger(dueYear) || dueYear < 1300 || dueYear > 1500) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12) {
      setError(t('checks.dueInvalid'))
      return
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > daysInJalaliMonth(dueYear, dueMonth)) {
      setError(t('checks.dueInvalid'))
      return
    }

    setError('')
    setCheckStatus(selectedCheck.id, 'issued', {
      payee,
      amount,
      purpose,
      dueYear,
      dueMonth,
      dueDay,
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
                              ? 'border-primary bg-accent text-primary-foreground'
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
              <Button
                type="button"
                onClick={goStep2}
                disabled={!selectedCheckId}
              >
                {t('common.next')} <ChevronRight className="size-4 ml-1" aria-hidden />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <form id="issue-check-form" onSubmit={e => e.preventDefault()} className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <Plus className="size-3" aria-hidden />
                <span>{t('checks.checkbook')} {book?.bank}</span>
                <span className="w-px bg-border"></span>
                <span>{t('checks.serial')} {selectedCheck?.serial}</span>
              </div>
              <Label htmlFor="issue-payee">{t('checks.payee')}</Label>
              <Input id="issue-payee" name="issue-payee" defaultValue={selectedCheck?.payee ?? ''} maxLength={80} />
              <Label htmlFor="issue-amount">{t('checks.amount')} ({t('common.toman')})</Label>
              <Input id="issue-amount" name="issue-amount" type="text" inputMode="numeric" defaultValue="" />
              <Label htmlFor="issue-purpose">{t('checks.purpose')}</Label>
              <Input id="issue-purpose" name="issue-purpose" defaultValue={selectedCheck?.purpose ?? ''} maxLength={120} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="issue-year">{t('loans.year')}</Label>
                  <Input id="issue-year" name="issue-year" type="number" defaultValue={String(cur.year)} min={1300} max={1500} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="issue-month">{t('loans.month')}</Label>
                  <Input id="issue-month" name="issue-month" type="number" defaultValue={String(cur.month)} min={1} max={12} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="issue-day">{t('common.day')}</Label>
                  <Input id="issue-day" name="issue-day" type="number" defaultValue={String(today.day)} min={1} max={31} />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronRight className="size-4 rotate-180 mr-1" aria-hidden /> {t('common.back')}
              </Button>
              <Button type="button" variant="destructive" onClick={handleIssue}>
                {t('checks.action.issued')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
