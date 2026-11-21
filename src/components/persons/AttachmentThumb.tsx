import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLocale } from '@/hooks/useLocale'
import { getAttachment } from '@/lib/attachments'
import { formatNumber } from '@/lib/money'
import type { Attachment } from '@/lib/types'

/** Resolve an attachment id to a temporary object URL from IndexedDB. */
function useAttachmentUrl(id?: string): string {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!id) return
    let cancelled = false
    let objectUrl = ''
    void getAttachment(id).then(blob => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}

export function AttachmentThumb({
  attachment,
  count,
  onClick,
}: {
  attachment: Attachment
  count: number
  onClick?: () => void
}) {
  const { t } = useTranslation()
  const { lang } = useLocale()
  const url = useAttachmentUrl(attachment.id)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('persons.viewAttachmentsAria', { count: formatNumber(count, lang) })}
      className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-md border"
    >
      {url ? (
        <img src={url} alt={attachment.name} className="size-full object-cover" />
      ) : (
        <ImageIcon className="text-muted-foreground absolute inset-0 m-auto size-4" aria-hidden />
      )}
      {count > 1 ? (
        <span className="absolute end-0.5 bottom-0.5 rounded bg-black/60 px-1 text-[10px] font-medium text-white tabular-nums">
          {formatNumber(count, lang)}
        </span>
      ) : null}
    </button>
  )
}

function ViewerImage({ attachment }: { attachment: Attachment }) {
  const url = useAttachmentUrl(attachment.id)
  return url ? (
    <a href={url} download={attachment.name} className="block">
      <img src={url} alt={attachment.name} className="w-full rounded-md border object-contain" />
    </a>
  ) : (
    <div className="bg-muted h-40 animate-pulse rounded-md" aria-hidden />
  )
}

export function AttachmentViewer({
  attachments,
  open,
  onOpenChange,
}: {
  attachments: Attachment[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('persons.attachments')}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {attachments.map(attachment => (
            <ViewerImage key={attachment.id} attachment={attachment} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
