import { Button, Input, Modal, Select, TextArea } from '@box/box-design'
import type { VoxaPlayMetadata } from '@box/voxa-project'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import styles from './preview-export-dialog.module.css'

type ExportAnimation = { id: string; name: string }
type PreviewExportOptions = {
  animations: ExportAnimation[]
  activeAnimationId?: string
  initialSettings?: VoxaPlayMetadata
  onSettingsChange?: (settings: VoxaPlayMetadata) => void
  onExport: (settings: VoxaPlayMetadata) => Promise<void>
}

type PreviewExportFormProps = PreviewExportOptions & {
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}

export function PreviewExportForm({
  animations,
  activeAnimationId,
  initialSettings,
  onSettingsChange,
  onExport,
  onClose,
  onBusyChange,
}: PreviewExportFormProps) {
  const form = useRef<HTMLFormElement>(null)
  const [author, setAuthor] = useState(initialSettings?.author ?? '')
  const [description, setDescription] = useState(initialSettings?.description ?? '')
  const [version, setVersion] = useState(initialSettings?.version ?? 'v1.0.0')
  const [defaultAnimationId, setDefaultAnimationId] = useState<string | null>(
    initialSettings
      ? animations.find((animation) => animation.id === initialSettings.defaultAnimationId)?.id ?? null
      : animations.find((animation) => animation.id === activeAnimationId)?.id ?? animations[0]?.id ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [])

  useEffect(() => {
    onSettingsChange?.({ author, description, version, defaultAnimationId })
  }, [author, description, version, defaultAnimationId, onSettingsChange])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    onBusyChange(true)
    setError('')
    try {
      await onExport({
        author: author.trim(),
        description: description.trim(),
        version: version.trim(),
        defaultAnimationId,
      })
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '预览包导出失败，请重试')
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }
  const handleKeys = (event: KeyboardEvent<HTMLFormElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!busy) onClose()
    }
    if (event.key !== 'Tab' || !form.current) return
    const elements = form.current.querySelectorAll<HTMLElement>(
      'input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)',
    )
    const first = elements[0],
      last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <form
      ref={form}
      className={styles.form}
      role="dialog"
      aria-modal="true"
      aria-label="导出预览包"
      onSubmit={(event) => void submit(event)}
      onKeyDown={handleKeys}
    >
      <fieldset disabled={busy} className={styles.fields}>
        <div className={styles.row}>
          <label>
            作者
            <Input
              className={styles.input}
              type="primary"
              size="middle"
              valueType="string"
              value={author}
              maxLength={100}
              disabled={busy}
              onBlurValidator={() => true}
              placeholder="填写模型作者"
              onChange={setAuthor}
            />
          </label>
          <label>
            版本
            <Input
              className={styles.input}
              type="primary"
              size="middle"
              valueType="string"
              value={version}
              maxLength={50}
              disabled={busy}
              onBlurValidator={() => true}
              required
              pattern=".*\S.*"
              placeholder="v1.0.0"
              onChange={setVersion}
            />
          </label>
        </div>
        <label>
          作品简介
          <TextArea
            className={styles.description}
            style={{ height: 92 }}
            value={description}
            maxLength={2000}
            disabled={busy}
            rows={4}
            placeholder="介绍你的模型"
            onChange={setDescription}
            onKeyDownCapture={(event) => {
              // Keep Enter as a newline instead of the shared field's finish-editing shortcut.
              if (event.key === 'Enter') event.stopPropagation()
            }}
          />
        </label>
        <div className={styles.animationField}>
          <span id="preview-export-animation-label">默认动画</span>
          <div
            className={styles.animationSelect}
            role="group"
            aria-labelledby="preview-export-animation-label"
            aria-disabled={busy || !animations.length}
          >
            <Select
              size="small"
              placement="bottomLeft"
              align={{ offset: [0, 4] }}
              disabled={busy || !animations.length}
              selection={defaultAnimationId === null ? 'static' : `motion:${defaultAnimationId}`}
              items={[
                { id: 'static', text: '静态（不自动播放）' },
                ...animations.map((animation) => ({
                  id: `motion:${animation.id}`,
                  text: animation.name || '未命名动画',
                })),
              ]}
              onSelect={({ id }) => {
                if (busy || !animations.length || typeof id !== 'string') return
                setDefaultAnimationId(id === 'static' ? null : id.slice(7))
              }}
            />
          </div>
          <small>
            {animations.length
              ? '打开预览时自动播放所选动画。'
              : '当前模型无动画，将以静态姿态展示。'}
          </small>
        </div>
      </fieldset>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button
          className={styles.action}
          type="secondary"
          size="medium"
          disabled={busy}
          onClick={(event) => {
            event.preventDefault()
            onClose()
          }}
        >
          取消
        </Button>
        <Button
          className={styles.action}
          type="primary"
          size="medium"
          disabled={busy}
          loading={busy}
          aria-label={busy ? '正在导出' : '导出'}
        >
          导出
        </Button>
      </div>
    </form>
  )
}

/** Mount outside the file menu, whose blur handler closes it when fields receive focus. */
export function openPreviewExportDialog(options: PreviewExportOptions) {
  let busy = false
  const close = Modal.show({
    title: '导出预览包',
    width: 420,
    style: { maxWidth: 'calc(100vw - 32px)' },
    content: (
      <PreviewExportForm
        {...options}
        onClose={() => close()}
        onBusyChange={(value) => {
          busy = value
        }}
      />
    ),
    onClose: () => {
      if (!busy) close()
    },
  })
}
