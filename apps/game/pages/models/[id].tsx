import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Share2, Check, ChevronRight } from 'lucide-react'
import { writeClipboardText } from '../../src/utils/copy2clipboard'
import type { GetServerSideProps } from 'next'
import type { PlayModel } from '@box/apis'
import { getPlayModel } from '../../server/play-models'
import styles from './models.module.css'

const Viewer = dynamic(() => import('../../components/model-preview/viewer'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      正在准备预览…
    </div>
  ),
})

function uploadedTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)
}

export default function PlayModelPage({
  model,
  embedded,
}: {
  model: PlayModel
  embedded: boolean
}) {
  const [shareState, setShareState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebar = useRef<HTMLElement>(null)
  const suppressClick = useRef(false)
  const sheetDrag = useRef<{
    id: number
    startY: number
    startOffset: number
    limit: number
    offset: number
    lastY: number
    lastTime: number
    velocity: number
    moved: boolean
  } | null>(null)
  const startSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary || sheetDrag.current || !sidebar.current) return
    const panel = sidebar.current
    const computed = getComputedStyle(panel)
    const offset = new DOMMatrixReadOnly(
      computed.transform === 'none' ? undefined : computed.transform,
    ).m42
    const peek =
      event.currentTarget.getBoundingClientRect().height + parseFloat(computed.paddingBottom)
    sheetDrag.current = {
      id: event.pointerId,
      startY: event.clientY,
      startOffset: offset,
      limit: Math.max(0, panel.getBoundingClientRect().height - peek),
      offset,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    }
    suppressClick.current = false
    panel.style.transition = 'none'
    panel.style.transform = `translateY(${offset}px)`
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = sheetDrag.current
    if (!drag || drag.id !== event.pointerId || !sidebar.current) return
    const delta = event.clientY - drag.startY
    const raw = drag.startOffset + delta
    drag.offset =
      raw < 0 ? raw * 0.12 : raw > drag.limit ? drag.limit + (raw - drag.limit) * 0.12 : raw
    if (event.timeStamp > drag.lastTime)
      drag.velocity = (event.clientY - drag.lastY) / (event.timeStamp - drag.lastTime)
    drag.lastY = event.clientY
    drag.lastTime = event.timeStamp
    drag.moved ||= Math.abs(delta) > 5
    sidebar.current.style.transform = `translateY(${drag.offset}px)`
    if (drag.moved) event.preventDefault()
  }
  const endSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = sheetDrag.current
    if (!drag || drag.id !== event.pointerId) return
    sheetDrag.current = null
    suppressClick.current = drag.moved
    if (drag.moved && !cancelled) {
      const velocity = event.timeStamp - drag.lastTime < 120 ? drag.velocity : 0
      setDetailsOpen(Math.abs(velocity) > 0.35 ? velocity < 0 : drag.offset < drag.limit / 2)
    }
    sidebar.current?.style.removeProperty('transition')
    sidebar.current?.style.removeProperty('transform')
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }
  useEffect(() => {
    if (shareState !== 'copied') return
    const timer = window.setTimeout(() => setShareState('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [shareState])
  const shareModel = async () => {
    setShareState('copying')
    try {
      const link = new URL(model.previewUrl, window.location.href)
      link.searchParams.delete('embedded')
      await writeClipboardText(link.href)
      setShareState('copied')
    } catch {
      setShareState('error')
    }
  }
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (detailsOpen) {
        event.preventDefault()
        setDetailsOpen(false)
      } else if (embedded) {
        window.parent.postMessage({ type: 'box-model-preview-close' }, window.location.origin)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [embedded, detailsOpen])
  return (
    <main className={styles.preview} data-sidebar-collapsed={sidebarCollapsed}>
      <Head>
        <title>{model.name} · 模型预览中心</title>
      </Head>
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background: #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
      {embedded ? (
        <button
          className={styles.back}
          type="button"
          onClick={() =>
            window.parent.postMessage({ type: 'box-model-preview-close' }, window.location.origin)
          }
        >
          <ArrowLeft size={16} aria-hidden="true" />
          返回
        </button>
      ) : null}
      <button
        className={styles.mobileShare}
        type="button"
        aria-label={shareState === 'copied' ? '链接已复制' : '分享模型'}
        disabled={shareState === 'copying'}
        onClick={() => void shareModel()}
      >
        {shareState === 'copied' ? <Check size={18} /> : <Share2 size={18} />}
      </button>
      <Viewer id={model.id} version={model.version} contentHash={model.contentHash} />
      <button
        className={styles.sidebarToggle}
        type="button"
        aria-label={sidebarCollapsed ? '展开作品介绍' : '收起作品介绍'}
        aria-expanded={!sidebarCollapsed}
        aria-controls="model-preview-details"
        onClick={() => setSidebarCollapsed((value) => !value)}
      >
        <ChevronRight size={15} aria-hidden="true" />
      </button>
      {detailsOpen ? (
        <button
          className={styles.detailsBackdrop}
          type="button"
          aria-label="收起作品介绍"
          onClick={() => setDetailsOpen(false)}
        />
      ) : null}
      <aside ref={sidebar} className={styles.sidebar} aria-label="作品介绍" data-open={detailsOpen}>
        <button
          className={styles.mobileSummary}
          type="button"
          aria-expanded={detailsOpen}
          aria-controls="model-preview-details"
          aria-label={`${detailsOpen ? '收起' : '展开'}作品介绍：${model.name}`}
          onPointerDown={startSheetDrag}
          onPointerMove={moveSheetDrag}
          onPointerUp={(event) => endSheetDrag(event)}
          onPointerCancel={(event) => endSheetDrag(event, true)}
          onLostPointerCapture={(event) => endSheetDrag(event, true)}
          onClick={(event) => {
            if (!suppressClick.current || event.detail === 0) setDetailsOpen((value) => !value)
            suppressClick.current = false
          }}
        >
          <span className={styles.summaryText}>
            <span className={styles.summaryTitle}>{model.name}</span>
            <span className={styles.summaryMeta}>
              {model.author || '未填写作者'} · {model.version}
            </span>
          </span>
        </button>
        <div className={styles.sidebarContent} id="model-preview-details">
          <h1>{model.name}</h1>
          {model.author ? <p className={styles.author}>作者：{model.author}</p> : null}
          <dl className={styles.metadata}>
            <div>
              <dt>版本</dt>
              <dd>{model.version}</dd>
            </div>
            <div>
              <dt>上传时间</dt>
              <dd>
                <time dateTime={model.importedAt}>{uploadedTime(model.importedAt)}</time>
              </dd>
            </div>
          </dl>
          <button
            className={styles.share}
            type="button"
            disabled={shareState === 'copying'}
            onClick={() => void shareModel()}
          >
            {shareState === 'copied' ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Share2 size={14} aria-hidden="true" />
            )}
            <span aria-live="polite">
              {shareState === 'copied'
                ? '链接已复制'
                : shareState === 'copying'
                  ? '正在复制…'
                  : '分享模型'}
            </span>
          </button>
          {shareState === 'error' ? (
            <p className={styles.copyError} role="alert">
              复制失败，请重试。
            </p>
          ) : null}
          <section className={styles.introduction}>
            <h2>作品介绍</h2>
            <p className={model.description ? styles.description : styles.placeholder}>
              {model.description || '暂无简介'}
            </p>
          </section>
          <section className={styles.instructions} aria-label="操作说明">
            <h2>操作说明</h2>
            <dl className={styles.mouseInstructions}>
              <div>
                <dt>左键 / 右键拖动</dt>
                <dd>旋转模型</dd>
              </div>
              <div>
                <dt>中键拖动</dt>
                <dd>平移画布</dd>
              </div>
              <div>
                <dt>滚动滚轮</dt>
                <dd>缩放模型</dd>
              </div>
              <div>
                <dt>Shift + 拖动</dt>
                <dd>旋转 / 平移互换</dd>
              </div>
            </dl>
            <dl className={styles.touchInstructions}>
              <div>
                <dt>单指拖动</dt>
                <dd>旋转模型</dd>
              </div>
              <div>
                <dt>双指拖动</dt>
                <dd>平移画布</dd>
              </div>
              <div>
                <dt>双指捏合</dt>
                <dd>缩放模型</dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play' || !process.env.BOX_PLAY_LIBRARY_PATH)
    return { notFound: true }
  try {
    const model = getPlayModel(String(params?.id || ''), true)
    return model ? { props: { model, embedded: query.embedded === '1' } } : { notFound: true }
  } catch {
    return { notFound: true }
  }
}
