export async function prepareMapResources({ server, mapId, bootstrap, remoteApi, onProgress }) {
  if (!bootstrap?.resourceAccessEnabled || !bootstrap.signingKey) {
    throw new Error('该服务器当前没有开放带签名的地图资源。')
  }
  const descriptorResult = await remoteApi.getDescriptor(server.endpoint, mapId)
  if (!descriptorResult.response.ok || !descriptorResult.data) {
    throw new Error(descriptorResult.data?.message || `读取地图资源清单失败（HTTP ${descriptorResult.response.status}）`)
  }
  const descriptor = descriptorResult.data
  const trustedSigningKey = bootstrap.signingKey
  const installPlan = await remoteApi.preparePackage(server.id, descriptor, trustedSigningKey)
  if (installPlan.insufficientStorage) {
    const required = (installPlan.missingBytes / 1024 / 1024 / 1024).toFixed(1)
    const available = (installPlan.availableBytes / 1024 / 1024 / 1024).toFixed(1)
    throw new Error(`设备空间不足：该地图还需要约 ${required} GB，可用空间约 ${available} GB。`)
  }

  let completedBytes = 0
  let downloadPlan
  const getDownloadPlan = async () => {
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
    const hash = installPlan.missingHashes[index]
    const asset = descriptor.required.find((entry) => entry.hash === hash)
    if (!asset) throw new Error('签名资源清单与下载计划不一致。')
    const resumeFrom = await remoteApi.getAssetResumeOffset(server.id, descriptor, trustedSigningKey, hash)
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
      if (!message.includes('授权已失效')) throw error
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

  const installed = await remoteApi.commitPackage(server.id, descriptor, trustedSigningKey)
  const launchPlan = await getDownloadPlan()
  return { descriptor, trustedSigningKey, installed, launchTicket: launchPlan.ticket }
}
