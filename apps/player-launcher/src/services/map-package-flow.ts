import type { MapPrepareProgress, PlayerServer, RemoteApi, ServerBootstrap } from '../types'

export interface PrepareMapResourcesOptions {
  server: PlayerServer
  mapId: string
  bootstrap: ServerBootstrap
  remoteApi: RemoteApi
  onProgress: (progress: MapPrepareProgress) => void
  onStage?: (stage: string) => void
}

export async function prepareMapResources({ server, mapId, bootstrap, remoteApi, onProgress, onStage }: PrepareMapResourcesOptions) {
  if (!bootstrap?.resourceAccessEnabled || !bootstrap.signingKey) {
    throw new Error('该服务器当前没有开放带签名的地图资源。')
  }
  onStage?.('读取地图资源描述符')
  const descriptorResult = await remoteApi.getDescriptor(server.endpoint, mapId)
  if (!descriptorResult.response.ok || !descriptorResult.data) {
    throw new Error(descriptorResult.data?.message || `读取地图资源清单失败（HTTP ${descriptorResult.response.status}）`)
  }
  const descriptor = descriptorResult.data
  const trustedSigningKey = bootstrap.signingKey
  onStage?.('验证签名并检查本机资源缓存')
  const installPlan = await remoteApi.preparePackage(server.id, descriptor, trustedSigningKey).catch((error) => {
    throw stageError('本机校验签名清单失败', error)
  })
  if (installPlan.insufficientStorage) {
    const required = (installPlan.missingBytes / 1024 / 1024 / 1024).toFixed(1)
    const available = (installPlan.availableBytes / 1024 / 1024 / 1024).toFixed(1)
    throw new Error(`设备空间不足：该地图还需要约 ${required} GB，可用空间约 ${available} GB。`)
  }

  let completedBytes = 0
  let downloadPlan
  const getDownloadPlan = async () => {
    onStage?.('获取地图下载授权')
    const result = await remoteApi.getDownloadPlan(server.endpoint, descriptor.accessId)
    if (!result.response.ok || !result.data?.ticket) {
      throw new Error(result.data?.message || `获取下载授权失败（HTTP ${result.response.status}）`)
    }
    if (result.data.manifestDigest !== descriptor.manifestDigest) {
      throw new Error('地图已发布新版本，请重新检查后再准备资源。')
    }
    return result.data
  }

  if (installPlan.missingHashes.length) downloadPlan = await getDownloadPlan()
  onProgress({
    done: 0,
    total: installPlan.missingHashes.length,
    completedBytes,
    receivedBytes: 0,
    totalBytes: installPlan.missingBytes,
  })
  for (let index = 0; index < installPlan.missingHashes.length; index += 1) {
    onStage?.(`下载并校验地图资源 ${index + 1}/${installPlan.missingHashes.length}`)
    const hash = installPlan.missingHashes[index]
    const asset = descriptor.required.find((entry) => entry.hash === hash)
    if (!asset) throw new Error('签名资源清单与下载计划不一致。')
    const resumeFrom = await remoteApi
      .getAssetResumeOffset(server.id, descriptor, trustedSigningKey, hash)
      .catch((error) => { throw stageError('检查本机资源缓存失败', error) })
    onProgress({
      done: index,
      total: installPlan.missingHashes.length,
      completedBytes,
      receivedBytes: completedBytes,
      totalBytes: installPlan.missingBytes,
      currentHash: hash,
      currentBytes: resumeFrom,
      resumeFrom,
    })

    const downloadAsset = () => remoteApi.installAsset(
      server.endpoint,
      server.id,
      descriptor.accessId,
      asset,
      descriptor,
      trustedSigningKey,
      downloadPlan,
      resumeFrom,
    )
    try {
      const result = await downloadAsset()
      if (!result.response.ok) throw new Error(`下载地图资源失败（HTTP ${result.response.status}）`)
    } catch (error) {
      const message = String(error?.message || error)
      if (!message.includes('授权已失效')) throw stageError('下载或校验地图资源失败', error)
      downloadPlan = await getDownloadPlan()
      const retry = await downloadAsset()
      if (!retry.response.ok) throw new Error(`下载地图资源失败（HTTP ${retry.response.status}）`)
    }

    completedBytes += Math.max(0, asset.size - resumeFrom)
    onProgress({
      done: index + 1,
      total: installPlan.missingHashes.length,
      completedBytes,
      receivedBytes: completedBytes,
      totalBytes: installPlan.missingBytes,
      currentHash: '',
      currentBytes: 0,
      resumeFrom: 0,
    })
  }

  onStage?.('校验并提交本机地图包')
  const installed = await remoteApi
    .commitPackage(server.id, descriptor, trustedSigningKey)
    .catch((error) => { throw stageError('提交本机地图包失败', error) })
  onStage?.('获取安全启动授权')
  const launchPlan = await getDownloadPlan()
  return { descriptor, trustedSigningKey, installed, launchTicket: launchPlan.ticket }
}

function stageError(stage: string, error: unknown): Error {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error ?? '')
  return new Error(message ? `${stage}：${message}` : `${stage}（本机命令未返回错误说明）`)
}
