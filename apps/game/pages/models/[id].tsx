import Head from 'next/head'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Share2, Check } from 'lucide-react'
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
    if (!embedded) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented)
        window.parent.postMessage({ type: 'box-model-preview-close' }, window.location.origin)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [embedded])
  return (
    <main className={styles.preview}>
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
      {!embedded ? (
        <Link className={styles.back} href="/models">
          <ArrowLeft size={16} aria-hidden="true" />
          返回模型
        </Link>
      ) : null}
      <Viewer id={model.id} version={model.version} contentHash={model.contentHash} />
      <aside className={styles.sidebar} aria-label="作品介绍">
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
          <dl>
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
          </dl>
        </section>
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
