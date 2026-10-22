import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef } from 'react'
import type { PlayModel } from '@box/apis'
import styles from './preview-overlay.module.css'

export function ModelPreviewOverlay({
  model,
  onClose,
  returnFocus,
}: {
  model: PlayModel | null
  onClose: () => void
  returnFocus: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (!model) return
    const closeFromFrame = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'box-model-preview-close'
      )
        onClose()
    }
    window.addEventListener('message', closeFromFrame)
    return () => window.removeEventListener('message', closeFromFrame)
  }, [model, onClose])
  return (
    <Dialog.Root
      open={Boolean(model)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus()
          }}
        >
          <Dialog.Title className={styles.hidden}>{model?.name} · 模型预览</Dialog.Title>
          {model ? (
            <iframe
              ref={frame}
              className={styles.frame}
              title={`${model.name} 模型预览`}
              src={`/models/${encodeURIComponent(model.id)}?embedded=1`}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
