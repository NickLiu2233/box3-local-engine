import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, Play, Pause, Check, ChevronDown, Grid3X3 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconSecondaryLocation, IconLight } from '@box/icons'
import type { VoxaPlayBundle } from '@box/voxa-project'
import { ModelPreviewRenderer } from './renderer'
import { apiClient } from '../../src/apis/client'
import styles from './viewer.module.css'
import { loadModelPreview } from './model-cache'

export default function ModelPreviewViewer({
  id,
  version,
  contentHash,
}: {
  id: string
  version: string
  contentHash: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<ModelPreviewRenderer | undefined>(undefined)
  const [bundle, setBundle] = useState<VoxaPlayBundle>()
  const [error, setError] = useState(''),
    [animation, setAnimation] = useState(-1),
    [playing, setPlaying] = useState(true),
    [gridVisible, setGridVisible] = useState(false),
    [emissiveEnabled, setEmissiveEnabled] = useState(true)
  useEffect(() => {
    const abort = new AbortController()
    let instance: ModelPreviewRenderer | undefined
    setBundle(undefined)
    setError('')
    setAnimation(-1)
    setGridVisible(false)
    setEmissiveEnabled(true)
    void (async () => {
      const data = await loadModelPreview({
        id,
        version,
        contentHash,
        origin: window.location.origin,
        signal: abort.signal,
        fetchBytes: async () => {
          const { response, data: bytes } = await apiClient.getApiPlayModelsIdRaw({
            params: { path: { id } },
            signal: abort.signal,
            parseAs: 'arrayBuffer',
          })
          if (!response.ok) throw new Error('模型预览不存在或已下架')
          if (!bytes) throw new Error('模型预览数据为空')
          return bytes
        },
      })
      if (abort.signal.aborted || !canvas.current) return
      instance = new ModelPreviewRenderer(canvas.current, data.model, data.placement)
      renderer.current = instance
      const initialAnimation =
        data.defaultAnimationId === null
          ? -1
          : data.model.animations.findIndex((item) => item.id === data.defaultAnimationId)
      instance.setAnimation(initialAnimation)
      instance.setPlaying(true)
      setAnimation(initialAnimation)
      setPlaying(true)
      setBundle(data)
    })().catch((error) => {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : '模型加载失败')
    })
    return () => {
      abort.abort()
      instance?.destroy()
      renderer.current = undefined
    }
  }, [id, version, contentHash])
  useEffect(() => {
    renderer.current?.setAnimation(animation)
  }, [animation])
  useEffect(() => {
    renderer.current?.setPlaying(playing)
  }, [playing])
  useEffect(() => {
    renderer.current?.setGridVisible(gridVisible)
  }, [gridVisible])
  useEffect(() => {
    renderer.current?.setEmissiveEnabled(emissiveEnabled)
  }, [emissiveEnabled])
  return (
    <section className={styles.viewer} aria-label="三维模型预览">
      <div className={styles.canvasArea}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          aria-label="左右键拖动旋转模型，中键拖动平移，滚轮缩放"
        />
        {!bundle && !error ? (
          <div className={styles.status} role="status">
            正在加载模型…
          </div>
        ) : null}
        {error ? (
          <div className={styles.status} role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className={styles.controls} role="group" aria-label="模型预览控制">
        <div className={styles.zoom}>
          <button
            aria-label="缩小模型"
            title="缩小模型"
            disabled={!bundle}
            onClick={() => renderer.current?.zoom(1.25)}
          >
            <Minus size={18} />
          </button>
          <button
            aria-label="放大模型"
            title="放大模型"
            disabled={!bundle}
            onClick={() => renderer.current?.zoom(0.8)}
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          aria-label="重置视角"
          title="重置视角"
          disabled={!bundle}
          onClick={() => renderer.current?.reset()}
        >
          <IconSecondaryLocation className={styles.voxaIcon} aria-hidden="true" />
        </button>
        <button
          className={gridVisible ? styles.activeTool : undefined}
          aria-label="显示网格"
          title="显示网格"
          aria-pressed={gridVisible}
          disabled={!bundle}
          onClick={() => setGridVisible((value) => !value)}
        >
          <Grid3X3 size={17} />
        </button>
        <button
          className={emissiveEnabled ? styles.activeTool : undefined}
          aria-label="发光"
          title="发光"
          aria-pressed={emissiveEnabled}
          disabled={!bundle}
          onClick={() => setEmissiveEnabled((value) => !value)}
        >
          <IconLight className={styles.voxaIcon} aria-hidden="true" />
        </button>
        {bundle?.model.animations.length ? (
          <>
            <span className={styles.divider} />
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger className={styles.animationTrigger} aria-label="动画">
                <span>
                  {animation < 0
                    ? '静态'
                    : bundle.model.animations[animation]?.name || `动画 ${animation + 1}`}
                </span>
                <ChevronDown size={13} aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.animationMenu}
                  side="top"
                  align="end"
                  sideOffset={10}
                  collisionPadding={12}
                >
                  <div className={styles.animationOptions}>
                    <DropdownMenu.RadioGroup
                      value={String(animation)}
                      onValueChange={(value) => {
                        setAnimation(Number(value))
                        setPlaying(true)
                      }}
                    >
                      {[
                        { value: -1, name: '静态' },
                        ...bundle.model.animations.map((item, index) => ({
                          value: index,
                          name: item.name || `动画 ${index + 1}`,
                        })),
                      ].map((item) => (
                        <DropdownMenu.RadioItem
                          className={styles.animationOption}
                          key={item.value}
                          value={String(item.value)}
                          onSelect={(event) => event.preventDefault()}
                        >
                          {item.name}
                          <DropdownMenu.ItemIndicator className={styles.selectedAnimation}>
                            <Check size={13} aria-hidden="true" />
                          </DropdownMenu.ItemIndicator>
                        </DropdownMenu.RadioItem>
                      ))}
                    </DropdownMenu.RadioGroup>
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {animation >= 0 ? (
              <button
                aria-label={playing ? '暂停动画' : '播放动画'}
                title={playing ? '暂停动画' : '播放动画'}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
