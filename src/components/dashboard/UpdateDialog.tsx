import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
  newVersion: string
  onUpdate: () => void
}

export function UpdateDialog({
  open,
  onOpenChange,
  currentVersion,
  newVersion,
  onUpdate,
}: Props) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t('update.title')}</DialogTitle>
          <AlertTriangle className="mx-auto size-6 text-amber-500 dark:text-amber-400" aria-hidden />
        </DialogHeader>
        <DialogDescription className="text-center text-sm mb-4">
          {t('update.available', { version: newVersion })}
        </DialogDescription>
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted border border-border rounded-lg">
          <div>
            <p className="text-sm sm:text-xs text-muted-foreground">{t('update.currentVersion')}</p>
            <p className="text-base sm:text-sm font-mono text-center">{currentVersion}</p>
          </div>
          <div>
            <p className="text-sm sm:text-xs text-muted-foreground">{t('update.newVersion')}</p>
            <p className="text-base sm:text-sm font-mono text-center text-foreground">{newVersion}</p>
          </div>
        </div>
        <p className="text-center text-sm sm:text-xs text-muted-foreground mb-4">
          {t('update.dataSafe')}
        </p>
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('update.later')}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              onUpdate()
            }}
          >
            {t('update.updateButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
