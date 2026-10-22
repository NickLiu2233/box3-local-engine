import Head from 'next/head'
import { useCallback, useRef, useState } from 'react'
import { ModelPreviewOverlay } from '../../components/model-preview/preview-overlay'
import type { GetServerSideProps } from 'next'
import type { PlayModel } from '@box/apis'
import { getPlayWorlds } from '../../server/play-worlds'
import { listPlayModels } from '../../server/play-models'
import {
  PlayWorkCenter,
  WorkCenterHeading,
  WorkCenterGrid,
  WorkCenterCard,
  WorkCenterEmpty,
} from '../../components/play-work-center/work-center'

export default function PlayModels({
  models,
  mapCount,
}: {
  models: PlayModel[]
  mapCount: number
}) {
  const [selectedModel, setSelectedModel] = useState<PlayModel | null>(null)
  const opener = useRef<HTMLAnchorElement | null>(null)
  const closePreview = useCallback(() => setSelectedModel(null), [])
  return (
    <PlayWorkCenter current="models" counts={{ maps: mapCount, models: models.length }}>
      <Head>
        <title>模型预览中心</title>
      </Head>
      <WorkCenterHeading title="模型" count={`${models.length} 个模型`} />
      {models.length ? (
        <WorkCenterGrid label="模型列表">
          {models.map((model) => (
            <WorkCenterCard
              key={model.id}
              href={`/models/${model.id}`}
              title={model.name}
              cover={model.previewImage}
              metadata={`${model.author || '未填写作者'} · ${model.version}`}
              badge={model.animationCount ? `${model.animationCount} 个动画` : '静态模型'}
              description={model.description}
              actionLabel="查看模型"
              onOpen={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return
                event.preventDefault()
                opener.current = event.currentTarget
                setSelectedModel(model)
              }}
            />
          ))}
        </WorkCenterGrid>
      ) : (
        <WorkCenterEmpty title="暂无模型" hint="上传模型后会显示在这里" />
      )}
      <ModelPreviewOverlay
        model={selectedModel}
        onClose={closePreview}
        returnFocus={() => opener.current?.focus()}
      />
    </PlayWorkCenter>
  )
}
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play' || !process.env.BOX_PLAY_LIBRARY_PATH)
    return { notFound: true }
  return { props: { models: listPlayModels(true), mapCount: getPlayWorlds().length } }
}
