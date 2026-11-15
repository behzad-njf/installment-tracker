import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CHECK_STATUS_TRANSITIONS } from '@/lib/checks'
import { currentMonthIndex, daysInJalaliMonth, jalaliPartsFromDate, yearMonthOf } from '@/lib/jalali'
import type { Check, CheckStatus } from '@/lib/types'

/**
 * Single place a check changes state. Issuing collects the fields a physical
 * check needs (payee, amount, purpose, due date); every other move is a confirm.
 */
export function CheckStatusDialog({
  check,
  onOpenChange,
  onSubmit,
}: {
  check: Check
  onOpenChange: (open: boolean) => void
  onSubmit: (status: CheckStatus, patch?: Partial<Check>) => boolean
}) {
  const { t } = useTranslation()
  const cur = yearMonthOf(currentMonthIndex())
  const today = jalaliPartsFromDate(new Date())
  const [target, setTarget] = useState<CheckStatus | null>(null)
  const [error, setError] = useState('')

  const allowed = CHECK_STATUS_TRANSITIONS[check.status]

  const issue = (form: HTMLFormElement) => {
    const field = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? ''
    const payee = field('payee')
    const amount = Number(field('amount'))
    const purpose = field('purpose')
    const dueYear = Number(field('year'))
    const dueMonth = Number(field('month'))
    const dueDay = Number(field('day'))

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
    if (onSubmit('issued', { payee, amount, purpose, dueYear, dueMonth, dueDay })) onOpenChange(false)
    else setError(t('checks.statusNotAllowed'))
  }

  return (
    <Dialog open onOpenChange={open => (open ? undefined : onOpenChange(false))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('checks.changeStatusTitle', {
              serial: check.serial !== undefined ? check.serial : '—',
            })}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">{t(`checks.status.${check.status}`)}</Badge>
            <ArrowLeftRight className="size-3.5" aria-hidden />
            {target ? t(`checks.status.${target}`) : t('checks.pickStatus')}
          </DialogDescription>
        </DialogHeader>

        {allowed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('checks.terminalStatus')}</p>
        ) : target === null ? (
          <div className="grid gap-2">
            {allowed.map(status => (
              <Button
                key={status}
                type="button"
                variant={status === 'void' || status === 'bounced' ? 'outline' : 'default'}
                className="justify-start"
                onClick={() => {
                  setError('')
                  setTarget(status)
                }}
              >
                {t(`checks.action.${status}`)}
              </Button>
            ))}
          </div>
        ) : target === 'issued' ? (
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault()
              issue(e.currentTarget)
            }}
          >
            <p className="text-sm text-muted-foreground">{t('checks.issueHint')}</p>
            <Label htmlFor="status-payee">{t('checks.payee')}</Label>
            <Input id="status-payee" name="payee" defaultValue={check.payee} maxLength={80} />
            <Label htmlFor="status-amount">{t('checks.amount')} ({t('common.toman')})</Label>
            <Input
              id="status-amount"
              name="amount"
              type="text"
              inputMode="numeric"
              defaultValue={check.amount > 0 ? String(check.amount) : ''}
            />
            <Label htmlFor="status-purpose">{t('checks.purpose')}</Label>
            <Input id="status-purpose" name="purpose" defaultValue={check.purpose ?? ''} maxLength={120} />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="status-year">{t('loans.year')}</Label>
                <Input id="status-year" name="year" type="number" defaultValue={String(check.dueYear ?? cur.year)} min={1300} max={1500} />
              </div>
              <div className="flex-1">
                <Label htmlFor="status-month">{t('loans.month')}</Label>
                <Input id="status-month" name="month" type="number" defaultValue={String(check.dueMonth ?? cur.month)} min={1} max={12} />
              </div>
              <div className="flex-1">
                <Label htmlFor="status-day">{t('common.day')}</Label>
                <Input id="status-day" name="day" type="number" defaultValue={String(check.dueDay ?? today.day)} min={1} max={31} />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                {t('common.back')}
              </Button>
              <Button type="submit">{t(`checks.action.issued`)}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t(`checks.confirmStatus.${target}`)}</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                {t('common.back')}
              </Button>
              <Button
                type="button"
                variant={target === 'void' || target === 'bounced' ? 'destructive' : 'default'}
                onClick={() => {
                  if (onSubmit(target)) onOpenChange(false)
                  else setError(t('checks.statusNotAllowed'))
                }}
              >
                {t(`checks.action.${target}`)}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
