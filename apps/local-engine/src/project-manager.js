'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')
const {
  ensurePlayImageArchive,
  getPlayImageConfig,
} = require('./play-image')

const packageRoot = path.resolve(__dirname, '..')
const projectsRoot = process.env.BOX_LOCAL_PROJECTS_PATH || path.join(packageRoot, 'projects')
const templateDataRoot = path.join(packageRoot, 'data')
const distributionRoot = path.join(packageRoot, 'dist', 'releases')
const projectExportRoot = path.join(packageRoot, 'dist', 'projects')
const projectIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/
// Cloud runtime assets use both CIDv0 and URL-safe SHA-256 names. Embedded
// extraProject metadata is binary, so publishing must discover both forms or
// models, skins and shared scripts disappear from the play package.
const cidPattern = /Qm[1-9A-HJ-NP-Za-km-z]{44}|(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g
const base58Alphabet =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const sensitiveContentRules = [
  ['私钥', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['数据库连接串', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"']+:[^\s"'@]+@/i],
  ['云访问密钥', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub 访问令牌', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ['Slack 访问令牌', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['OpenAI 风格密钥', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['服主管理密钥', /\bBOX_PLAY_ADMIN_TOKEN\b/],
  [
    '硬编码密码或令牌',
    /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["'][^"'\r\n]{12,}["']/i,
  ],
]

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const entries = Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
  return `{${entries.join(',')}}`
}

function encodeBase58(buffer) {
  const digits = [0]
  for (const byte of buffer) {
    let carry = byte
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8
      digits[index] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }
  let result = ''
  for (const byte of buffer) {
    if (byte !== 0) break
    result += base58Alphabet[0]
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    result += base58Alphabet[digits[index]]
  }
  return result
}

function contentHash(content) {
  const digest = crypto.createHash('sha256').update(content).digest()
  return encodeBase58(Buffer.concat([Buffer.from([0x12, 0x20]), digest]))
}

function storeReleaseBlob(releaseBlobRoot, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
  const hash = contentHash(buffer)
  const target = path.join(releaseBlobRoot, hash)
  fs.mkdirSync(releaseBlobRoot, { recursive: true })
  if (!fs.existsSync(target)) fs.writeFileSync(target, buffer, { mode: 0o644 })
  return hash
}

function storeReleaseJSON(releaseBlobRoot, value) {
  return storeReleaseBlob(releaseBlobRoot, stableStringify(value))
}

function readBlobJSON(blobRoot, hash, label) {
  const target = path.join(blobRoot, hash || '')
  if (!hash || !fs.existsSync(target)) {
    throw new Error(`${label}不存在：${hash || 'empty hash'}`)
  }
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'))
  } catch {
    throw new Error(`${label}格式无效：${hash}`)
  }
}

function assertNoSensitiveContent(blobRoot, hashes) {
  for (const hash of hashes) {
    const target = path.join(blobRoot, hash)
    const stat = fs.statSync(target)
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue
    const content = fs.readFileSync(target)
    if (content.includes(0)) continue
    const text = content.toString('utf8')
    for (const [label, rule] of sensitiveContentRules) {
      if (rule.test(text)) {
        throw new Error(`发布已阻止：作品资源 ${hash} 包含疑似${label}，请移除后再发布`)
      }
    }
  }
}

function collectReferencedHashes(target, hashes) {
  if (!fs.existsSync(target)) return
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      collectReferencedHashes(path.join(target, entry), hashes)
    }
    return
  }
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024) return
  const content = fs.readFileSync(target, 'utf8')
  for (const hash of content.match(cidPattern) || []) hashes.add(hash)
}

function getRuntimeTemplateHashes() {
  const manifest = readJSON(
    path.join(templateDataRoot, 'runtime-blobs.json'),
    null,
  )
  if (Array.isArray(manifest?.hashes)) return new Set(manifest.hashes)

  const hashes = new Set()
  for (const target of [
    path.join(packageRoot, '../game/src/resource'),
    path.join(packageRoot, '../../services/game-server/dist/src/assets'),
    path.join(packageRoot, '../../services/game-server/src/assets'),
    path.join(
      packageRoot,
      '../../services/game-server/src/player/default-avatar.json',
    ),
  ]) {
    collectReferencedHashes(target, hashes)
  }
  return hashes
}

function getReachableProjectHashes(blobRoot, rootHash) {
  const hashes = new Set()
  const pending = [rootHash]
  while (pending.length) {
    const hash = pending.pop()
    if (!hash || hashes.has(hash)) continue
    const blobPath = path.join(blobRoot, hash)
    if (!fs.existsSync(blobPath)) {
      throw new Error(`工程引用的资源不存在：${hash}`)
    }
    hashes.add(hash)
    const stat = fs.statSync(blobPath)
    if (stat.size > 32 * 1024 * 1024) continue
    const content = fs.readFileSync(blobPath, 'utf8')
    for (const childHash of content.match(cidPattern) || []) {
      if (!hashes.has(childHash)) pending.push(childHash)
    }
  }
  return hashes
}

// Docker Desktop bind mounts on macOS can turn fs.copyFileSync outputs into
// mode 0200 files. The container then cannot read its own exported resources.
// Copy through explicitly-created descriptors so the destination remains 0644.
function copyReadableFileSync(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  const sourceFd = fs.openSync(source, 'r')
  const destinationFd = fs.openSync(destination, 'w', 0o644)
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  try {
    let bytesRead
    do {
      bytesRead = fs.readSync(sourceFd, buffer, 0, buffer.length, null)
      if (bytesRead) fs.writeSync(destinationFd, buffer, 0, bytesRead)
    } while (bytesRead)
  } finally {
    fs.closeSync(sourceFd)
    fs.closeSync(destinationFd)
  }
}

function createReleaseData(sourceRoot, releaseDataRoot, state) {
  const sourceBlobRoot = path.join(sourceRoot, 'blobs')
  const releaseBlobRoot = path.join(releaseDataRoot, 'blobs')
  const permission = readBlobJSON(
    sourceBlobRoot,
    state.permissionHash,
    '工程权限数据',
  )
  const versionControl = readBlobJSON(
    sourceBlobRoot,
    permission.versionControl,
    '工程版本数据',
  )
  const sourceProjectHash = versionControl?.branches?.master?.headHash
  const project = readBlobJSON(
    sourceBlobRoot,
    sourceProjectHash,
    '工程地图数据',
  )
  const scriptAssets = readBlobJSON(
    sourceBlobRoot,
    project.scriptAssets,
    '工程脚本索引',
  )

  // A published world only needs the current project head. Remove editor
  // history, commit identity and asset ownership before creating the release.
  const publishedScriptAssets = {}
  const privateHashes = new Set()
  for (const [name, asset] of Object.entries(scriptAssets || {})) {
    publishedScriptAssets[name] = {
      ...asset,
      contentId: 0,
      ownerId: 0,
    }
    // Server scripts run inside the isolated server VM. Players never need
    // their source bytes, so keep them in the package but deny HTTP access.
    if (asset?.type === 1 && typeof asset.hash === 'string') {
      privateHashes.add(asset.hash)
    }
  }
  const publishedScriptAssetsHash = storeReleaseJSON(
    releaseBlobRoot,
    publishedScriptAssets,
  )
  const publishedProject = {
    ...project,
    committerId: 0,
    prevHash: '',
    scriptAssets: publishedScriptAssetsHash,
    timestamp: new Date(0).toISOString(),
  }
  const publishedProjectHash = storeReleaseJSON(
    releaseBlobRoot,
    publishedProject,
  )

  // Permissions are required by the prebake schema, but user lists, groups,
  // collaborators and version history are editor-only private information.
  const publishedVersionControlHash = storeReleaseJSON(releaseBlobRoot, {
    branches: {
      master: { headHash: publishedProjectHash, name: 'master' },
    },
    currentBranch: 'master',
  })
  const emptyGroupsHash = storeReleaseJSON(releaseBlobRoot, {})
  const emptyUsersHash = storeReleaseJSON(releaseBlobRoot, {})
  const emptyBannedHash = storeReleaseJSON(releaseBlobRoot, [])
  const emptyCollaboratorsHash = storeReleaseJSON(releaseBlobRoot, [])
  const publishedPermissionHash = storeReleaseJSON(releaseBlobRoot, {
    ...permission,
    accessLevel: 1,
    banned: emptyBannedHash,
    collaborators: emptyCollaboratorsHash,
    groups: emptyGroupsHash,
    owner: 0,
    prevHash: '',
    timestamp: new Date(0).toISOString(),
    users: emptyUsersHash,
    versionControl: publishedVersionControlHash,
  })
  for (const hash of [
    publishedPermissionHash,
    publishedVersionControlHash,
    emptyGroupsHash,
    emptyUsersHash,
    emptyBannedHash,
    emptyCollaboratorsHash,
  ]) {
    privateHashes.add(hash)
  }

  const currentProjectHashes = new Set()
  for (const hash of stableStringify(publishedProject).match(cidPattern) || []) {
    if (hash === publishedScriptAssetsHash) continue
    for (const reachable of getReachableProjectHashes(sourceBlobRoot, hash)) {
      currentProjectHashes.add(reachable)
    }
  }
  for (const asset of Object.values(publishedScriptAssets)) {
    for (const hash of [asset?.hash, asset?.previewImage]) {
      if (!hash) continue
      for (const reachable of getReachableProjectHashes(sourceBlobRoot, hash)) {
        currentProjectHashes.add(reachable)
      }
    }
  }
  if (state.extraProjectHash) {
    for (const hash of getReachableProjectHashes(
      sourceBlobRoot,
      state.extraProjectHash,
    )) {
      currentProjectHashes.add(hash)
    }
  }
  for (const hash of Object.values(state.skinPreviews || {})) {
    if (typeof hash !== 'string' || !hash) continue
    for (const reachable of getReachableProjectHashes(sourceBlobRoot, hash)) {
      currentProjectHashes.add(reachable)
    }
  }
  for (const hash of Object.values(state.skinProjects || {})) {
    if (typeof hash !== 'string' || !hash) continue
    for (const reachable of getReachableProjectHashes(sourceBlobRoot, hash)) {
      currentProjectHashes.add(reachable)
    }
  }
  assertNoSensitiveContent(sourceBlobRoot, currentProjectHashes)

  const hashes = getRuntimeTemplateHashes()
  for (const hash of currentProjectHashes) hashes.add(hash)

  fs.mkdirSync(releaseBlobRoot, { recursive: true })
  for (const hash of hashes) {
    const source = path.join(sourceBlobRoot, hash)
    if (!fs.existsSync(source)) {
      throw new Error(`发布所需的资源不存在：${hash}`)
    }
    copyReadableFileSync(source, path.join(releaseBlobRoot, hash))
  }
  const releaseState = {
    formatVersion: 1,
    permissionHash: publishedPermissionHash,
    extraProjectHash: state.extraProjectHash || '',
    ...(state.skinPreviews ? { skinPreviews: state.skinPreviews } : {}),
    ...(state.skinProjects ? { skinProjects: state.skinProjects } : {}),
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(
    path.join(releaseDataRoot, 'project-state.json'),
    `${JSON.stringify(releaseState, null, 2)}\n`,
  )
  fs.writeFileSync(
    path.join(releaseDataRoot, 'private-blobs.json'),
    `${JSON.stringify(
      { formatVersion: 1, hashes: [...privateHashes].sort() },
      null,
      2,
    )}\n`,
  )
  fs.writeFileSync(
    path.join(releaseDataRoot, 'runtime-blobs.json'),
    `${JSON.stringify(
      {
        formatVersion: 1,
        hashes: [
          ...new Set([
            ...hashes,
            publishedScriptAssetsHash,
            publishedProjectHash,
            ...privateHashes,
          ]),
        ].sort(),
      },
      null,
      2,
    )}\n`,
  )
  return releaseState
}

function assertProjectId(id) {
  if (!projectIdPattern.test(id || '')) {
    throw new Error('Project ID must use lowercase letters, numbers, and hyphens')
  }
  return id
}

function assertVersion(version) {
  if (!/^v?[0-9][a-zA-Z0-9.-]{0,62}$/.test(version || '')) {
    throw new Error('Version must start with a number and contain only letters, numbers, dots, or hyphens')
  }
  return version
}

function projectRoot(id) {
  return path.join(projectsRoot, assertProjectId(id))
}

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    if (error && error.code === 'ENOENT' && fallback !== undefined) return fallback
    throw error
  }
}

function writeJSON(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(temporaryPath, filePath)
}

function relativeTime(value) {
  const age = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(age / 60000)
  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function toProjectSummary(metadata) {
  const releases = Array.isArray(metadata.releases) ? metadata.releases : []
  const latestRelease = releases.length ? releases[releases.length - 1] : undefined
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description || '',
    updatedAt: relativeTime(metadata.updatedAt),
    updatedAtISO: metadata.updatedAt,
    status: releases.length ? '已发布' : '草稿',
    releaseCount: releases.length,
    author: metadata.author || '',
    cover: metadata.cover || '',
    latestRelease: latestRelease ? latestRelease.version : '',
    latestReleaseNotes: latestRelease?.notes || '',
    theme: metadata.theme || 'sunset',
  }
}

function getProject(id) {
  const root = projectRoot(id)
  const metadataPath = path.join(root, 'project.json')
  const metadata = readJSON(metadataPath)
  if (!metadata || metadata.id !== id) throw new Error(`Invalid project metadata: ${id}`)
  return metadata
}

function listProjects() {
  if (!fs.existsSync(projectsRoot)) return []
  return fs.readdirSync(projectsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && projectIdPattern.test(entry.name))
    .flatMap((entry) => {
      try {
        return [toProjectSummary(getProject(entry.name))]
      } catch {
        return []
      }
    })
    .sort((left, right) => right.updatedAtISO.localeCompare(left.updatedAtISO))
}

function createProject({ id, name, author = '', description = '' }) {
  const safeId = assertProjectId(id)
  const root = projectRoot(safeId)
  if (fs.existsSync(root)) throw new Error(`Project already exists: ${safeId}`)
  if (!name || !name.trim()) throw new Error('Project name is required')
  if (!fs.existsSync(templateDataRoot)) throw new Error('Local Engine template data is missing')

  fs.mkdirSync(root, { recursive: true })
  fs.cpSync(templateDataRoot, path.join(root, 'source'), { recursive: true })
  const now = new Date().toISOString()
  const themes = ['sunset', 'ocean', 'forest', 'violet']
  const metadata = {
    formatVersion: 1,
    id: safeId,
    name: name.trim(),
    author: author.trim().slice(0, 80),
    description: description.trim(),
    theme: themes[listProjects().length % themes.length],
    createdAt: now,
    updatedAt: now,
    releases: [],
  }
  writeJSON(path.join(root, 'project.json'), metadata)
  return toProjectSummary(metadata)
}

function updateProject(id, patch) {
  const metadata = getProject(id)
  if (typeof patch.name === 'string' && patch.name.trim()) metadata.name = patch.name.trim()
  if (typeof patch.author === 'string') metadata.author = patch.author.trim().slice(0, 80)
  if (typeof patch.description === 'string') metadata.description = patch.description.trim()
  if (typeof patch.cover === 'string') {
    if (patch.cover && (!/^data:image\/(png|jpeg|webp);base64,/.test(patch.cover) || Buffer.byteLength(patch.cover, 'utf8') > 2 * 1024 * 1024)) {
      throw new Error('封面必须是小于 2MB 的 PNG、JPG 或 WebP 图片')
    }
    metadata.cover = patch.cover
  }
  metadata.updatedAt = new Date().toISOString()
  writeJSON(path.join(projectRoot(id), 'project.json'), metadata)
  return toProjectSummary(metadata)
}

function runTar(args, message) {
  const result = spawnSync('tar', args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${message}: ${result.stderr || result.stdout || 'tar failed'}`)
  return result.stdout
}

function exportProject(id) {
  const metadata = getProject(id)
  const root = projectRoot(id)
  fs.mkdirSync(projectExportRoot, { recursive: true })
  const safeName = metadata.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || '作品'
  const filename = `${safeName}_${id}.boxproject`
  const archivePath = path.join(projectExportRoot, filename)
  runTar(['-czf', archivePath, '-C', root, 'project.json', 'source'], 'Unable to export project')
  return { archivePath, filename, name: metadata.name }
}

function archiveEntriesAreSafe(archivePath) {
  const entries = runTar(['-tzf', archivePath], 'Unable to read project archive').trim().split('\n').filter(Boolean)
  if (!entries.includes('project.json') || !entries.some((entry) => entry === 'source/' || entry.startsWith('source/'))) {
    throw new Error('工程包缺少 project.json 或 source/')
  }
  for (const entry of entries) {
    if (entry.startsWith('/') || entry.includes('\\') || entry.split('/').includes('..')) {
      throw new Error('工程包包含不安全的文件路径')
    }
    if (entry !== 'project.json' && entry !== 'source' && !entry.startsWith('source/')) {
      throw new Error('工程包包含不支持的内容')
    }
  }
}

function nextImportedId(id) {
  const base = assertProjectId(id).slice(0, 48)
  let candidate = `${base}-imported`
  let index = 2
  while (fs.existsSync(path.join(projectsRoot, candidate))) {
    candidate = `${base.slice(0, 58 - String(index).length)}-imported-${index}`
    index += 1
  }
  return candidate
}

function importProject(archivePath) {
  if (!archivePath || !fs.existsSync(archivePath)) throw new Error('未找到工程包')
  archiveEntriesAreSafe(archivePath)
  const temporaryRoot = path.join(projectsRoot, '.imports', `${process.pid}-${Date.now()}`)
  fs.mkdirSync(temporaryRoot, { recursive: true })
  try {
    runTar(['-xzf', archivePath, '-C', temporaryRoot], 'Unable to import project')
    const metadata = readJSON(path.join(temporaryRoot, 'project.json'))
    if (!metadata || typeof metadata.id !== 'string' || !metadata.name || !fs.existsSync(path.join(temporaryRoot, 'source'))) {
      throw new Error('工程包内容无效')
    }
    const id = nextImportedId(metadata.id)
    const root = projectRoot(id)
    const now = new Date().toISOString()
    fs.mkdirSync(root, { recursive: true })
    fs.cpSync(path.join(temporaryRoot, 'source'), path.join(root, 'source'), { recursive: true, dereference: true })
    const imported = {
      formatVersion: 1,
      id,
      name: metadata.name,
      description: metadata.description || '',
      author: metadata.author || '',
      cover: metadata.cover || '',
      theme: metadata.theme || 'sunset',
      createdAt: now,
      updatedAt: now,
      releases: [],
    }
    writeJSON(path.join(root, 'project.json'), imported)
    return toProjectSummary(imported)
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function deleteProject(id) {
  const root = projectRoot(id)
  if (!fs.existsSync(root)) throw new Error(`Project does not exist: ${id}`)
  fs.rmSync(root, { recursive: true, force: false })
}

function publishProject(id, requestedVersion, notes = '') {
  const metadata = getProject(id)
  const root = projectRoot(id)
  const sourceRoot = path.join(root, 'source')
  const state = readJSON(path.join(sourceRoot, 'project-state.json'), {})
  if (!state.permissionHash) {
    throw new Error('请先打开该工程并在编辑器中保存一次，再发布为游玩包')
  }

  const version = assertVersion(requestedVersion || `v${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`)
  const releaseRoot = path.join(root, 'releases', version)
  if (fs.existsSync(releaseRoot)) throw new Error(`Release already exists: ${version}`)

  const release = {
    formatVersion: 1,
    id: metadata.id,
    projectName: metadata.name,
    author: metadata.author || '',
    description: metadata.description || '',
    cover: metadata.cover || '',
    theme: metadata.theme || 'sunset',
    version,
    createdAt: new Date().toISOString(),
    permissionHash: '',
    immutable: true,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
  }
  const temporaryReleaseRoot = `${releaseRoot}.${process.pid}.tmp`
  fs.rmSync(temporaryReleaseRoot, { recursive: true, force: true })
  try {
    fs.mkdirSync(temporaryReleaseRoot, { recursive: true })
    const releaseState = createReleaseData(
      sourceRoot,
      path.join(temporaryReleaseRoot, 'data'),
      state,
    )
    release.permissionHash = releaseState.permissionHash
    writeJSON(path.join(temporaryReleaseRoot, 'manifest.json'), release)
    fs.renameSync(temporaryReleaseRoot, releaseRoot)
  } catch (error) {
    fs.rmSync(temporaryReleaseRoot, { recursive: true, force: true })
    throw error
  }
  metadata.releases = [...(metadata.releases || []), release]
  metadata.updatedAt = release.createdAt
  writeJSON(path.join(root, 'project.json'), metadata)
  return release
}

function getLaunchTarget({ project, release }) {
  if (project && release) throw new Error('Choose a project source or a release, not both')
  if (project) {
    const root = projectRoot(project)
    if (!fs.existsSync(path.join(root, 'project.json'))) throw new Error(`Project does not exist: ${project}`)
    return {
      kind: 'source',
      id: project,
      dataRoot: path.join(root, 'source'),
      statePath: path.join(root, 'source', 'project-state.json'),
    }
  }
  if (release) {
    const [id, version, ...extra] = release.split('@')
    if (extra.length || !id || !version) throw new Error('Release must use <project-id>@<version>')
    const root = path.join(projectRoot(id), 'releases', assertVersion(version))
    const manifestPath = path.join(root, 'manifest.json')
    const dataRoot = path.join(root, 'data')
    const statePath = path.join(dataRoot, 'project-state.json')
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`发布版本不存在：${release}`)
    }
    const manifest = readJSON(manifestPath)
    if (manifest.id !== id || manifest.version !== version) {
      throw new Error(`发布清单与请求不一致：${release}`)
    }
    if (!fs.existsSync(dataRoot) || !fs.existsSync(statePath)) {
      throw new Error(`发布版本数据不完整：${release}`)
    }
    const state = readJSON(statePath)
    if (
      typeof manifest.permissionHash !== 'string' ||
      !manifest.permissionHash ||
      state.permissionHash !== manifest.permissionHash
    ) {
      throw new Error(`发布版本世界哈希不一致：${release}`)
    }
    return {
      kind: 'release',
      id,
      version,
      dataRoot,
      statePath,
      permissionHash: manifest.permissionHash,
    }
  }
  return undefined
}

function includePlayImage(destination) {
  const config = ensurePlayImageArchive()
  copyReadableFileSync(config.archive, destination)
  return config
}

function copyReleaseWorld(releaseRoot, sourceRoot, destination) {
  const releaseDataRoot = path.join(releaseRoot, 'data')
  const destinationDataRoot = path.join(destination, 'data')
  const runtimeManifest = readJSON(
    path.join(releaseDataRoot, 'runtime-blobs.json'),
    null,
  )
  if (!Array.isArray(runtimeManifest?.hashes)) {
    throw new Error('发布版本缺少资源清单，请重新发布该版本')
  }

  copyReadableFileSync(
    path.join(releaseRoot, 'manifest.json'),
    path.join(destination, 'manifest.json'),
  )
  copyReadableFileSync(
    path.join(releaseDataRoot, 'project-state.json'),
    path.join(destinationDataRoot, 'project-state.json'),
  )
  copyReadableFileSync(
    path.join(releaseDataRoot, 'private-blobs.json'),
    path.join(destinationDataRoot, 'private-blobs.json'),
  )
  fs.writeFileSync(
    path.join(destinationDataRoot, 'runtime-blobs.json'),
    `${JSON.stringify(runtimeManifest, null, 2)}\n`,
  )

  for (const hash of runtimeManifest.hashes) {
    if (typeof hash !== 'string' || !/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash)) {
      throw new Error('发布版本的资源清单无效')
    }
    const releasedBlob = path.join(releaseDataRoot, 'blobs', hash)
    const sourceBlob = path.join(sourceRoot, 'blobs', hash)
    const destinationBlob = path.join(destinationDataRoot, 'blobs', hash)
    try {
      // Docker Desktop may report R_OK for an old 0200 file and still fail
      // with ENOENT when it is actually opened, so probe by copying it.
      copyReadableFileSync(releasedBlob, destinationBlob)
    } catch (error) {
      if (!['EACCES', 'ENOENT', 'EPERM'].includes(error?.code)) throw error
      // Older releases created through Docker Desktop may contain unreadable
      // 0200 files. The source blob with the same content hash is byte-identical.
      try {
        copyReadableFileSync(sourceBlob, destinationBlob)
      } catch (sourceError) {
        if (!['EACCES', 'ENOENT', 'EPERM'].includes(sourceError?.code)) {
          throw sourceError
        }
        throw new Error(`发布版本缺少资源：${hash}`)
      }
    }
  }
}

function safeFilename(value, fallback) {
  return String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 80) || fallback
}

function exportPlayBundle(reference) {
  const target = getLaunchTarget({ release: reference })
  const root = projectRoot(target.id)
  const releaseRoot = path.join(root, 'releases', target.version)
  const manifest = readJSON(path.join(releaseRoot, 'manifest.json'))
  const exportRoot = path.join(distributionRoot, '.exports')
  const nonce = `${process.pid}_${Date.now()}`
  const temporaryRoot = path.join(exportRoot, `${target.id}_${target.version}_${nonce}`)
  const worldRoot = path.join(temporaryRoot, target.id)
  const filename = `${safeFilename(manifest.projectName, '作品')}_${target.id}_${safeFilename(target.version, 'latest')}.boxplay`
  const archivePath = path.join(exportRoot, `${nonce}.boxplay`)

  fs.mkdirSync(exportRoot, { recursive: true })
  try {
    copyReleaseWorld(releaseRoot, path.join(root, 'source'), worldRoot)
    runTar(
      ['-czf', archivePath, '-C', temporaryRoot, target.id],
      'Unable to export play bundle',
    )
    return { archivePath, temporaryRoot, filename }
  } catch (error) {
    fs.rmSync(archivePath, { force: true })
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
    throw error
  }
}

function packageProject(reference, outputDirectory, options = {}) {
  const target = getLaunchTarget({ release: reference })
  const releaseRoot = path.join(projectRoot(target.id), 'releases', target.version)
  const manifest = readJSON(path.join(releaseRoot, 'manifest.json'))
  const bundleName = `${target.id}-${target.version}`
  const bundleRoot = outputDirectory
    ? path.resolve(outputDirectory)
    : path.join(distributionRoot, bundleName)
  if (fs.existsSync(bundleRoot)) {
    throw new Error(`Distribution already exists: ${bundleRoot}`)
  }

  let playImageConfig = getPlayImageConfig()
  const contents = ['world', 'compose.yml', 'README.md']
  if (options.includeImages) contents.push('play-image.tar')
  const temporaryBundleRoot = `${bundleRoot}.${process.pid}.tmp`

  fs.mkdirSync(path.dirname(bundleRoot), { recursive: true })
  fs.rmSync(temporaryBundleRoot, { recursive: true, force: true })
  try {
    fs.mkdirSync(temporaryBundleRoot, { recursive: true })
    copyReleaseWorld(
      releaseRoot,
      path.join(projectRoot(target.id), 'source'),
      path.join(temporaryBundleRoot, 'world'),
    )

    if (options.includeImages) {
      playImageConfig = includePlayImage(
        path.join(temporaryBundleRoot, 'play-image.tar'),
      )
    }

    writeJSON(path.join(temporaryBundleRoot, 'release.json'), {
      formatVersion: 1,
      project: target.id,
      name: manifest.projectName,
      author: manifest.author || '',
      description: manifest.description || '',
      cover: manifest.cover || '',
      version: target.version,
      notes: manifest.notes || '',
      createdAt: new Date().toISOString(),
      permissionHash: manifest.permissionHash,
      image: playImageConfig.image,
      platform: playImageConfig.platform,
      contents,
    })
    fs.writeFileSync(
      path.join(temporaryBundleRoot, 'compose.yml'),
      `services:\n  play:\n    platform: \${BOX_PLAY_PLATFORM:-${playImageConfig.platform}}\n    image: \${BOX_PLAY_IMAGE:-${playImageConfig.image}}\n    restart: unless-stopped\n    environment:\n      BOX_DEPLOYMENT_MODE: play\n      BOX_WORLD_PATH: /app/world/data\n      BOX_WORLD_STATE_PATH: /app/world/data/project-state.json\n      BOX_WORLD_HASH: ${manifest.permissionHash}\n      BOX_WORLD_ID: ${manifest.id}\n      BOX_WORLD_NAME: ${JSON.stringify(manifest.projectName)}\n      BOX_LOCAL_PLAYER_LIMIT: \${BOX_LOCAL_PLAYER_LIMIT:-8}\n      PERMISSION_TOKEN_SECRET: \${PERMISSION_TOKEN_SECRET:-}\n      BOX_SERVER_PUBLIC_URL: \${BOX_SERVER_PUBLIC_URL:-}\n      BOX_TRUST_PROXY: \${BOX_TRUST_PROXY:-false}\n      BOX_SESSION_TTL_MS: \${BOX_SESSION_TTL_MS:-60000}\n      BOX_SESSION_RATE_LIMIT_PER_MINUTE: \${BOX_SESSION_RATE_LIMIT_PER_MINUTE:-60}\n      BOX_DATA_STORAGE_DRIVER: \${BOX_DATA_STORAGE_DRIVER:-legacy}\n      BOX_DATABASE_URL: \${BOX_DATABASE_URL:-}\n      BOX_DATABASE_SCHEMA: \${BOX_DATABASE_SCHEMA:-box_engine}\n      BOX_DATABASE_POOL_SIZE: \${BOX_DATABASE_POOL_SIZE:-10}\n      BOX_DATABASE_SSL: \${BOX_DATABASE_SSL:-false}\n      BOX_DATABASE_SSL_REJECT_UNAUTHORIZED: \${BOX_DATABASE_SSL_REJECT_UNAUTHORIZED:-true}\n      BOX_DATA_STORAGE_LOCK_TIMEOUT_MS: \${BOX_DATA_STORAGE_LOCK_TIMEOUT_MS:-10000}\n      BOX_DATA_STORAGE_NAMESPACE: \${BOX_DATA_STORAGE_NAMESPACE:-}\n      BOX_DATA_STORAGE_NAMESPACE_PREFIX: \${BOX_DATA_STORAGE_NAMESPACE_PREFIX:-}\n      BOX_GROUP_STORAGE_NAMESPACE: \${BOX_GROUP_STORAGE_NAMESPACE:-}\n    ports:\n      - \"\${BOX_PORT:-3000}:3000\"\n    volumes:\n      - type: bind\n        source: ./world\n        target: /app/world\n        read_only: true\n        bind:\n          create_host_path: false\n`,
    )
    fs.writeFileSync(
      path.join(temporaryBundleRoot, 'README.md'),
      `# ${manifest.projectName} ${target.version}\n\n作者：${manifest.author || '未署名'}\n\n${manifest.description || '暂无作品简介。'}\n\n这是一个只读游玩发布包，不包含作品的 \`source/\` 工程目录、编辑器或创作管理器。镜像架构为 \`${playImageConfig.platform}\`。\n\n## 部署\n\n1. 执行 \`docker load -i play-image.tar\`。\n2. 执行 \`docker compose up -d\`。\n3. 玩家打开 \`http://服务器地址:3000/\`。\n\n如需修改端口，可在同目录创建 \`.env\` 并填写 \`BOX_PORT=新端口\`。网页、地图资源和联机连接均使用这一个地址，不需要再配置或开放其他端口。\n\n需要持久化游戏脚本的数据空间时，由服主在同一个 \`.env\` 中配置 \`BOX_DATA_STORAGE_DRIVER=postgres\` 和 \`BOX_DATABASE_URL\`。数据库凭据只会传入服务端容器，不会发送给玩家浏览器。\n\n\`world/\` 是 ${target.version} 的不可变世界快照，并以只读方式挂载，不能被 Local Engine 直接当作可编辑工程导入。可信服主仍可读取运行所需的世界数据，因此不要把未发布素材或真正的服务器秘密放进作品资源。\n`,
    )
    fs.renameSync(temporaryBundleRoot, bundleRoot)
  } catch (error) {
    fs.rmSync(temporaryBundleRoot, { recursive: true, force: true })
    throw error
  }
  return {
    directory: bundleRoot,
    project: target.id,
    version: target.version,
    includesDockerImages: !!options.includeImages,
    image: playImageConfig.image,
    platform: playImageConfig.platform,
  }
}

module.exports = {
  createProject,
  deleteProject,
  exportProject,
  exportPlayBundle,
  getLaunchTarget,
  getProject,
  listProjects,
  importProject,
  packageProject,
  projectsRoot,
  publishProject,
  updateProject,
}

if (require.main === module) {
  const [command, ...args] = process.argv.slice(2)
  try {
    if (command === 'list') {
      console.table(listProjects())
    } else if (command === 'create') {
      const [id, ...name] = args
      console.log(JSON.stringify(createProject({ id, name: name.join(' ') || id }), null, 2))
    } else if (command === 'publish') {
      const [id, version] = args
      console.log(JSON.stringify(publishProject(id, version), null, 2))
    } else if (command === 'package') {
      const includeImages = !args.includes('--no-image')
      const [reference, outputDirectory] = args.filter((arg) => arg !== '--no-image')
      console.log(JSON.stringify(packageProject(reference, outputDirectory, { includeImages }), null, 2))
    } else {
      throw new Error('Usage: project-manager.js <list|create|publish|package> [arguments]')
    }
  } catch (error) {
    console.error(`Project command failed: ${error.message}`)
    process.exitCode = 1
  }
}
