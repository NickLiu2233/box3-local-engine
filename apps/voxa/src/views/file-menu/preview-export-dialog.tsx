import { Modal } from '@box/box-design'
import type { VoxaPlayMetadata } from '@box/voxa-project'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import styles from './preview-export-dialog.module.css'

type ExportAnimation = { id: string; name: string }
type PreviewExportOptions = {
  name: string
  animations: ExportAnimation[]
  activeAnimationId?: string
  onExport: (settings: VoxaPlayMetadata) => Promise<void>
}

type PreviewExportFormProps = PreviewExportOptions & {
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}

export function PreviewExportForm({
  name,
  animations,
  activeAnimationId,
  onExport,
  onClose,
  onBusyChange,
}: PreviewExportFormProps) {
  const form = useRef<HTMLFormElement>(null)
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('v1.0.0')
  const [defaultAnimationId, setDefaultAnimationId] = useState<string | null>(
    animations.find((animation) => animation.id === activeAnimationId)?.id ??
      animations[0]?.id ??
      null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [])

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
      <p className={styles.name}>{name}</p>
      <fieldset disabled={busy} className={styles.fields}>
        <div className={styles.row}>
          <label>
            作者
            <input
              value={author}
              maxLength={100}
              placeholder="填写模型作者"
              onChange={(event) => setAuthor(event.target.value)}
            />
          </label>
          <label>
            版本
            <input
              value={version}
              maxLength={50}
              required
              pattern=".*\S.*"
              placeholder="v1.0.0"
              onChange={(event) => setVersion(event.target.value)}
            />
          </label>
        </div>
        <label>
          作品简介
          <textarea
            value={description}
            maxLength={2000}
            rows={4}
            placeholder="介绍你的模型"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          默认动画
          <select
            value={defaultAnimationId === null ? 'static' : `motion:${defaultAnimationId}`}
            disabled={busy || !animations.length}
            onChange={(event) =>
              setDefaultAnimationId(
                event.target.value === 'static' ? null : event.target.value.slice(7),
              )
            }
          >
            <option value="static">静态（不自动播放）</option>
            {animations.map((animation) => (
              <option key={animation.id} value={`motion:${animation.id}`}>
                {animation.name || '未命名动画'}
              </option>
            ))}
          </select>
          <small>
            {animations.length
              ? '打开预览时自动播放所选动画。'
              : '当前模型没有动画，打开预览时显示静态模型。'}
          </small>
        </label>
      </fieldset>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={onClose}>
          取消
        </button>
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? '正在导出…' : '导出预览包'}
        </button>
      </div>
    </form>
  )
}

/** Mount outside the file menu, whose blur handler closes it when fields receive focus. */
export function openPreviewExportDialog(options: PreviewExportOptions) {
  let busy = false
  const close = Modal.show({
    title: '导出预览包',
    width: 440,
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
