import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { artifactName, validateManifest } from './release-contract.mts'
import type { PlayerTarget, ReleaseInfo } from './release-contract.mts'

interface CacheStore {
  directory: string
  head: (key: string) => Promise<{ ContentLength: number } | null>
  download: (key: string, file: string) => Promise<void>
}

export async function cachedInstaller(oss: CacheStore, info: ReleaseInfo, target: PlayerTarget): Promise<boolean> {
  const key = `box-player-launcher/${info.tag}/${artifactName(info, target)}`
  const installer = await oss.head(key)
  if (!installer) return false
  if (!(await oss.head(`${key}.build.json`))) return false
  const temporary = path.join(oss.directory, 'cached-manifest.json')
  await oss.download(`${key}.build.json`, temporary)
  const manifest = validateManifest(JSON.parse(await readFile(temporary, 'utf8')), info, target)
  if (installer.ContentLength !== manifest.size) throw new Error(`Cached installer size differs from metadata: ${manifest.file}`)
  return true
}
