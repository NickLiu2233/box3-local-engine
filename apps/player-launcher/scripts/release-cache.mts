import { artifactName, validateManifest } from './release-contract.mts'
import type { ArtifactManifest, PlayerTarget, ReleaseInfo } from './release-contract.mts'
import type { OssObjectHead } from './oss-client.mts'

export function manifestMetadata(manifest: ArtifactManifest): Record<string, string> {
  return {
    'player-format': String(manifest.formatVersion),
    'player-tag': manifest.tag,
    'player-version': manifest.version,
    'player-commit': manifest.commit,
    'player-target': manifest.target,
    'player-size': String(manifest.size),
    'player-sha256': manifest.sha256,
  }
}

export function manifestFromHead(head: OssObjectHead, info: ReleaseInfo, target: PlayerTarget): ArtifactManifest | null {
  if (!Number.isSafeInteger(head.ContentLength) || head.ContentLength <= 0) throw new Error('OSS installer is empty or has invalid size')
  const metadata = head.Metadata || {}
  // Reuse installers uploaded by the previous workflow, even without object metadata.
  if (!Object.keys(metadata).some((key) => key.startsWith('player-'))) return null
  const manifest = validateManifest({
    formatVersion: Number(metadata['player-format']),
    tag: metadata['player-tag'], version: metadata['player-version'], commit: metadata['player-commit'],
    target: metadata['player-target'], file: artifactName(info, target),
    size: Number(metadata['player-size']), sha256: metadata['player-sha256'],
  }, info, target)
  if (head.ContentLength !== manifest.size) throw new Error(`Cached installer size differs from metadata: ${manifest.file}`)
  return manifest
}

export async function cachedInstaller(
  oss: { head: (key: string) => Promise<OssObjectHead | null> },
  info: ReleaseInfo,
  target: PlayerTarget,
): Promise<boolean> {
  const head = await oss.head(`box-player-launcher/${info.tag}/${artifactName(info, target)}`)
  if (!head) return false
  manifestFromHead(head, info, target)
  return true
}
