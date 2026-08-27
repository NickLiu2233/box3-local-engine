import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  CircleUserRound,
  LogOut,
  Settings,
  Upload,
  X,
} from 'lucide-react'
import type { PlayWorld } from '../server/play-worlds'
import { getPlayWorlds } from '../server/play-worlds'
import { isPlayAdminEnabled } from '../server/play-admin-security'
import { getPlayPresenceCounts } from '../server/play-presence'
import {
  importResponseError,
  type DetailedImportError,
  type ImportDiagnostic,
} from '../server/import-diagnostics'

const TOKEN_KEY = 'box-play-admin-token'

type MapDiscoveryStats = {
  onlineCount: number
}

type MapResourceStatus = {
  bytes: number
  importedAt: string
}

// 仅供 BOX_UI_PREVIEW 开发服务展示首页布局；生产路径不会使用这些数据。
const previewWorlds: PlayWorld[] = [
  {
    id: 'preview-arena', mapUuid: 'preview-arena', publicId: 'preview-arena', name: '竞技场：破晓行动', author: 'BOX3 Studio', description: '在立体竞技场中完成一场快速对战。', cover: '/map-templates/arena-template.png', version: 'v1.2.0', mapGroupId: 'preview-arena', mapRole: 'main', mainProjectId: 'preview-arena', playEnabled: true,
  },
  {
    id: 'preview-race', mapUuid: 'preview-race', publicId: 'preview-race', name: '极速赛道', author: 'BOX3 Studio', description: '穿过弯道与加速带，第一个冲过终点。', cover: '/map-templates/raceway-template.png', version: 'v1.0.4', mapGroupId: 'preview-race', mapRole: 'main', mainProjectId: 'preview-race', playEnabled: true,
  },
  {
    id: 'preview-explore', mapUuid: 'preview-explore', publicId: 'preview-explore', name: '空岛探索', author: 'BOX3 Studio', description: '从一座空岛开始，探索属于你的世界。', cover: '/map-templates/blank-template.png', version: 'v1.0.0', mapGroupId: 'preview-explore', mapRole: 'main', mainProjectId: 'preview-explore', playEnabled: true,
  },
  {
    id: 'preview-build', mapUuid: 'preview-build', publicId: 'preview-build', name: '方块工坊', author: 'BOX3 Studio', description: '自由搭建、分享与协作的创造空间。', cover: '/map-templates/blank-template.png', version: 'v1.1.1', mapGroupId: 'preview-build', mapRole: 'main', mainProjectId: 'preview-build', playEnabled: true,
  },
  {
    id: 'preview-chase', mapUuid: 'preview-chase', publicId: 'preview-chase', name: '追逐时刻', author: 'BOX3 Studio', description: '一场考验反应与路线判断的限时挑战。', cover: '/map-templates/arena-template.png', version: 'v1.0.2', mapGroupId: 'preview-chase', mapRole: 'main', mainProjectId: 'preview-chase', playEnabled: true,
  },
]

const previewMapStats: Record<string, MapDiscoveryStats> = {
  'preview-arena': { onlineCount: 24 },
  'preview-race': { onlineCount: 12 },
  'preview-explore': { onlineCount: 8 },
  'preview-build': { onlineCount: 4 },
  'preview-chase': { onlineCount: 17 },
}

const previewResourceStatuses: Record<string, MapResourceStatus> = {
  'preview-arena': { bytes: 48 * 1024 * 1024, importedAt: '2026-08-27T08:30:00.000Z' },
  'preview-race': { bytes: 36 * 1024 * 1024, importedAt: '2026-08-26T04:15:00.000Z' },
  'preview-explore': { bytes: 22 * 1024 * 1024, importedAt: '2026-08-25T11:00:00.000Z' },
  'preview-build': { bytes: 31 * 1024 * 1024, importedAt: '2026-08-24T06:45:00.000Z' },
  'preview-chase': { bytes: 27 * 1024 * 1024, importedAt: '2026-08-23T02:20:00.000Z' },
}

const builtInSkinOptions = [
  { id: 'explorer', name: '探险者', preview: '/built-in-skins/explorer.png' },
  { id: 'pilot', name: '飞行员', preview: '/built-in-skins/pilot.png' },
  { id: 'cowboy', name: '牛仔', preview: '/built-in-skins/cowboy.png' },
  { id: 'chinese-doll', name: '中国娃娃', preview: '/built-in-skins/chinese-doll.png' },
  { id: 'pink-girl', name: '粉红女孩', preview: '/built-in-skins/pink-girl.png' },
  { id: 'maid', name: '女仆', preview: '/built-in-skins/maid.png' },
  { id: 'little-prince', name: '小王子', preview: '/built-in-skins/little-prince.png' },
  { id: 'christmas-girl', name: '圣诞女孩', preview: '/built-in-skins/christmas-girl.png' },
] as const

type ImportProgress = {
  filename: string
  phase: 'uploading' | 'processing' | 'done' | 'error'
  percent: number
  sent: number
  total: number
  elapsedSeconds: number
  worldName?: string
  mapCount?: number
  message?: string
  details?: ImportDiagnostic[]
}

function isPlayEnabled(world: PlayWorld) {
  // 老游玩包的 manifest 没有该字段时，保持历史行为：默认允许进入。
  return world.playEnabled !== false
}

function formatBytes(value: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function HomePage({
  worlds,
  adminEnabled,
  adminToolsVisible,
  uiPreview,
  mapStats,
}: {
  worlds: PlayWorld[]
  adminEnabled: boolean
  adminToolsVisible: boolean
  uiPreview: boolean
  mapStats: Record<string, MapDiscoveryStats>
}) {
  const importInput = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [worldList, setWorldList] = useState(worlds)
  const [liveMapStats, setLiveMapStats] = useState(mapStats)
  const [resourceStatuses, setResourceStatuses] = useState<Record<string, MapResourceStatus>>({})
  const [adminToken, setAdminToken] = useState('')
  const [verified, setVerified] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [playerUserId, setPlayerUserId] = useState('')
  const [playerBoxId, setPlayerBoxId] = useState('')
  const [playerAvatar, setPlayerAvatar] = useState('')
  const [playerSkinId, setPlayerSkinId] = useState('explorer')
  const [previewSignedIn, setPreviewSignedIn] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)
  const [libraryEnabled, setLibraryEnabled] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [profileSkinId, setProfileSkinId] = useState('explorer')
  const [profileSaving, setProfileSaving] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'favorites'>('all')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [loginOpen, setLoginOpen] = useState(false)
  const [deleteWorld, setDeleteWorld] = useState<PlayWorld | null>(null)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [editWorld, setEditWorld] = useState<PlayWorld | null>(null)
  const [editPublicId, setEditPublicId] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const worldGroups = useMemo(() => {
    const groups = new Map<string, PlayWorld[]>()
    for (const world of worldList) {
      const groupId = world.mapGroupId || world.mainProjectId || world.id
      const members = groups.get(groupId) || []
      members.push(world)
      groups.set(groupId, members)
    }
    return Array.from(groups, ([groupId, members]) => {
      const mainProjectId = members[0]?.mainProjectId || groupId
      const main =
        members.find((world) => world.id === mainProjectId) ||
        members.find((world) => world.mapRole === 'main') ||
        members[0]
      return {
        groupId,
        main,
        submaps: members.filter((world) => world.id !== main.id),
      }
    })
  }, [worldList])

  useEffect(() => {
    if (uiPreview) return
    const mapIds = worldList.map((world) => world.publicId).filter(Boolean)
    if (!mapIds.length) return
    let cancelled = false
    const refresh = () => {
      fetch(`/api/play-presence?maps=${encodeURIComponent(mapIds.join(','))}`)
        .then((response) => (response.ok ? response.json() : undefined))
        .then((data) => {
          if (!cancelled && data?.maps) setLiveMapStats(data.maps)
        })
        .catch(() => undefined)
    }
    refresh()
    const timer = window.setInterval(refresh, 20_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [uiPreview, worldList])

  useEffect(() => {
    if (!verified) {
      setResourceStatuses({})
      return
    }
    if (uiPreview) {
      setResourceStatuses(previewResourceStatuses)
      return
    }
    let cancelled = false
    fetch('/api/play-admin/worlds/status', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.worlds)) return
        setResourceStatuses(
          Object.fromEntries(
            data.worlds.map((world: { id: string; bytes: number; importedAt: string }) => [
              world.id,
              { bytes: world.bytes, importedAt: world.importedAt },
            ]),
          ),
        )
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [adminToken, uiPreview, verified])

  async function verifyToken(token: string, quiet = false) {
    const response = await fetch('/api/play-admin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      if (!quiet) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '验证失败')
      }
      return false
    }
    sessionStorage.setItem(TOKEN_KEY, token)
    setAdminToken(token)
    setVerified(true)
    setLoginOpen(false)
    return true
  }

  useEffect(() => {
    if (!adminEnabled) return
    const saved = sessionStorage.getItem(TOKEN_KEY)
    if (saved)
      verifyToken(saved, true).then((valid) => {
        if (!valid) sessionStorage.removeItem(TOKEN_KEY)
      })
  }, [adminEnabled])

  useEffect(() => {
    if (uiPreview) {
      setLibraryEnabled(true)
      return
    }
    fetch('/api/play-library')
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        setPlayerName(data.player?.displayName || data.player?.username || '')
        setPlayerUserId(data.player?.userId || '')
        setPlayerBoxId(data.player?.boxId || '')
        setPlayerAvatar(data.player?.avatar || '')
        setPlayerSkinId(data.player?.avatarSkinId || 'explorer')
        setLibraryEnabled(data.libraryEnabled !== false)
        const entries = data.entries || []
        const favorites = entries.filter((entry: { favorite: boolean }) => entry.favorite)
        const recent = entries.filter(
          (entry: { lastPlayedAt: string | null }) => entry.lastPlayedAt,
        )
        setFavoriteCount(favorites.length)
        setRecentCount(recent.length)
        setFavoriteIds(new Set(favorites.map((entry: { mapId: string }) => entry.mapId)))
        setRecentIds(recent.map((entry: { mapId: string }) => entry.mapId))
      })
      .catch(() => undefined)
  }, [uiPreview])

  useEffect(() => {
    const closeAccountMenu = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeAccountMenu)
    return () => document.removeEventListener('mousedown', closeAccountMenu)
  }, [])

  const updateLibrary = (mapId: string, changes: Record<string, boolean>) =>
    fetch('/api/play-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapId, ...changes }),
    }).catch(() => undefined)
  const toggleFavorite = (mapId: string) => {
    const next = new Set(favoriteIds)
    next.has(mapId) ? next.delete(mapId) : next.add(mapId)
    setFavoriteIds(next)
    setFavoriteCount(next.size)
    void updateLibrary(mapId, { favorite: next.has(mapId) })
  }
  const recordRecent = (mapId: string) => {
    setRecentIds((current) => [mapId, ...current.filter((value) => value !== mapId)])
    void updateLibrary(mapId, { played: true })
  }
  // 关闭是面向玩家的下线状态：服主仍能在管理视图看到并重新开启，
  // 玩家首页、收藏和最近游玩中都不应暴露该地图组。
  const playableWorldGroups = worldGroups.filter(({ main }) => isPlayEnabled(main))
  const playerGroups =
    collectionView === 'favorites'
      ? playableWorldGroups.filter(({ main }) => favoriteIds.has(main.publicId))
      : collectionView === 'recent'
        ? [...playableWorldGroups]
            .sort((a, b) => recentIds.indexOf(a.main.publicId) - recentIds.indexOf(b.main.publicId))
            .filter(({ main }) => recentIds.includes(main.publicId))
        : playableWorldGroups
  const libraryGroups = playerGroups
  const deleteTargets = deleteWorld
    ? deleteWorld.mapRole === 'main'
      ? worldList.filter(
          (world) =>
            (world.mapGroupId || world.mainProjectId || world.id) ===
            (deleteWorld.mapGroupId || deleteWorld.mainProjectId || deleteWorld.id),
        )
      : [deleteWorld]
    : []

  const previewSignIn = () => {
    setPreviewSignedIn(true)
    setPlayerName('测试玩家')
    setPlayerUserId('10001')
    setPlayerBoxId('')
    setLibraryEnabled(true)
  }

  const openAdminTools = () => {
    if (uiPreview) {
      setVerified(true)
      setAccountOpen(false)
      setLoginOpen(false)
      setNotice('')
      return
    }
    setLoginOpen(true)
  }

  async function importBundle(file: File) {
    if (importProgress && importProgress.phase !== 'done' && importProgress.phase !== 'error')
      return
    setBusy('import')
    setNotice('')
    const startedAt = Date.now()
    setImportProgress({
      filename: file.name,
      phase: 'uploading',
      percent: 0,
      sent: 0,
      total: file.size,
      elapsedSeconds: 0,
    })
    const timer = window.setInterval(() => {
      setImportProgress((current) => {
        if (!current || (current.phase !== 'uploading' && current.phase !== 'processing'))
          return current
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
        return {
          ...current,
          elapsedSeconds,
          percent:
            current.phase === 'processing'
              ? Math.min(95, Math.max(current.percent, 75 + elapsedSeconds * 2))
              : current.percent,
        }
      })
    }, 500)
    try {
      const data = await new Promise<{
        world?: PlayWorld
        worlds?: PlayWorld[]
        mapCount?: number
        message?: string
        details?: ImportDiagnostic[]
      }>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('POST', '/api/play-admin/import')
        request.setRequestHeader('Authorization', `Bearer ${adminToken}`)
        request.setRequestHeader('Content-Type', 'application/octet-stream')
        request.upload.onprogress = (event) => {
          const total = event.lengthComputable ? event.total : file.size
          setImportProgress((current) =>
            current
              ? {
                  ...current,
                  phase: 'uploading',
                  percent: total ? Math.min(70, (event.loaded / total) * 70) : 0,
                  sent: event.loaded,
                  total,
                  elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
                }
              : current,
          )
        }
        request.upload.onload = () => {
          setImportProgress((current) =>
            current
              ? {
                  ...current,
                  phase: 'processing',
                  percent: 75,
                  sent: file.size,
                  total: file.size,
                  elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
                }
              : current,
          )
        }
        request.onerror = () => reject(new Error('无法连接游玩端，游玩包上传失败'))
        request.onabort = () => reject(new Error('导入已取消'))
        request.onload = () => {
          let result: {
            world?: PlayWorld
            worlds?: PlayWorld[]
            mapCount?: number
            message?: string
            details?: ImportDiagnostic[]
          } = {}
          try {
            result = JSON.parse(request.responseText || '{}')
          } catch {
            /* handled below */
          }
          if (request.status >= 200 && request.status < 300) resolve(result)
          else reject(importResponseError(result, request.status, '导入游玩包失败'))
        }
        request.send(file)
      })
      const importedWorlds = data.worlds?.length ? data.worlds : data.world ? [data.world] : []
      if (importedWorlds.length) {
        const importedIds = new Set(importedWorlds.map((world) => world.id))
        setWorldList((current) => [
          ...importedWorlds,
          ...current.filter((world) => !importedIds.has(world.id)),
        ])
      }
      setImportProgress({
        filename: file.name,
        phase: 'done',
        percent: 100,
        sent: file.size,
        total: file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        worldName: data.world?.name,
        mapCount: data.mapCount || importedWorlds.length || 1,
      })
    } catch (error) {
      setImportProgress((current) => ({
        filename: file.name,
        phase: 'error',
        percent: current?.percent || 0,
        sent: current?.sent || 0,
        total: current?.total || file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        message: error instanceof Error ? error.message : '导入游玩包失败',
        details: (error as Partial<DetailedImportError>)?.details || [],
      }))
    } finally {
      window.clearInterval(timer)
      setBusy('')
    }
  }

  async function confirmDelete() {
    if (!deleteWorld || !deleteConfirmed) return
    if (uiPreview) {
      const deletedIds = new Set(deleteTargets.map((world) => world.id))
      setWorldList((current) => current.filter((world) => !deletedIds.has(world.id)))
      setDeleteConfirmed(false)
      setDeleteWorld(null)
      setNotice('')
      return
    }
    setBusy(`delete:${deleteWorld.id}`)
    setNotice('')
    try {
      const response = await fetch(`/api/play-admin/worlds/${encodeURIComponent(deleteWorld.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '删除失败')
      }
      window.location.reload()
    } catch (error) {
      setNotice((error as Error).message)
      setBusy('')
      setDeleteWorld(null)
    }
  }

  function requestDelete(world: PlayWorld) {
    setDeleteConfirmed(false)
    setDeleteWorld(world)
  }

  async function toggleWorldAvailability(world: PlayWorld) {
    if (uiPreview) {
      const groupId = world.mapGroupId || world.mainProjectId || world.id
      const playEnabled = !isPlayEnabled(world)
      setWorldList((current) =>
        current.map((entry) =>
          (entry.mapGroupId || entry.mainProjectId || entry.id) === groupId
            ? { ...entry, playEnabled }
            : entry,
        ),
      )
      setNotice('')
      return
    }
    setBusy(`availability:${world.id}`)
    setNotice('')
    try {
      const response = await fetch(`/api/play-admin/worlds/${encodeURIComponent(world.id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ playEnabled: !isPlayEnabled(world) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '设置失败')
      const changed = new Map<string, PlayWorld>(
        ((data.worlds || []) as PlayWorld[]).map((entry) => [entry.id, entry]),
      )
      setWorldList((current) => current.map((entry) => changed.get(entry.id) || entry))
      setNotice(
        isPlayEnabled(world) ? '地图组已关闭，玩家暂时无法进入' : '地图组已启动，玩家可以进入',
      )
    } catch (error) {
      setNotice((error as Error).message)
    } finally {
      setBusy('')
    }
  }

  function openWorldEditor(world: PlayWorld) {
    setEditWorld(world)
    setEditPublicId(world.publicId)
    setNotice('')
  }

  async function saveWorld(event: FormEvent) {
    event.preventDefault()
    if (!editWorld) return
    if (uiPreview) {
      const publicId = editPublicId.trim()
      setWorldList((current) =>
        current.map((world) => (world.id === editWorld.id ? { ...world, publicId } : world)),
      )
      setEditWorld(null)
      setNotice('')
      return
    }
    setBusy(`edit:${editWorld.id}`)
    setNotice('')
    try {
      const response = await fetch(`/api/play-admin/worlds/${encodeURIComponent(editWorld.id)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: editPublicId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '保存失败')
      setWorldList((current) =>
        current.map((world) => (world.id === editWorld.id ? data.world : world)),
      )
      setEditWorld(null)
      setNotice(`地图信息已保存，访问链接为 /p/${data.world.publicId}`)
    } catch (error) {
      setNotice((error as Error).message)
    } finally {
      setBusy('')
    }
  }

  function exitAdmin() {
    sessionStorage.removeItem(TOKEN_KEY)
    setAdminToken('')
    setVerified(false)
  }

  async function logoutAccount() {
    setAccountOpen(false)
    if (!uiPreview) {
      const response = await fetch('/api/play-logout', { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) {
        setNotice('退出登录失败，请稍后重试')
        return
      }
    }
    setPreviewSignedIn(false)
    setPlayerName('')
    setPlayerUserId('')
    setPlayerBoxId('')
    setPlayerAvatar('')
    setPlayerSkinId('explorer')
    setLibraryEnabled(false)
    setFavoriteIds(new Set())
    setRecentIds([])
    setFavoriteCount(0)
    setRecentCount(0)
  }

  function openProfileEditor() {
    setAccountOpen(false)
    setProfileName(playerName)
    setProfileAvatar(playerAvatar)
    setProfileSkinId(playerSkinId)
    setProfileOpen(true)
  }

  function selectProfileAvatar(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setNotice('请上传 PNG、JPEG、WebP 或 GIF 格式的头像')
      return
    }
    if (file.size > 512 * 1024) {
      setNotice('头像图片不能超过 512 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProfileAvatar(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const displayName = profileName.trim()
    if (!displayName) {
      setNotice('请输入昵称')
      return
    }
    setProfileSaving(true)
    try {
      if (uiPreview) {
        setPlayerName(displayName)
        setPlayerAvatar(profileAvatar)
        setPlayerSkinId(profileSkinId)
      } else {
        const response = await fetch('/api/play-profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, avatar: profileAvatar, avatarSkinId: profileSkinId }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || '资料保存失败')
        setPlayerName(data.player?.displayName || displayName)
        setPlayerAvatar(data.player?.avatar || '')
        setPlayerSkinId(data.player?.avatarSkinId || profileSkinId)
      }
      setProfileOpen(false)
      setNotice('资料已保存')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '资料保存失败')
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <>
      <Head>
        <title>游玩作品中心</title>
      </Head>
      <main className="page boxWorkCenter playWorkCenter">
        <header className="siteHeader">
          <Link
            className="siteBrand"
            href="/"
            aria-label="BOX3 Engine 游玩作品中心"
            style={{
              alignItems: 'center',
              color: '#f5f5f5',
              display: 'inline-flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              gap: 9,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <img className="siteMark" src="/logo512.png" alt="" aria-hidden="true" />
            <span className="siteBrandName" style={{ color: '#f5f5f5' }}>
              BOX3 Engine
            </span>
          </Link>

          {verified ? null : playerName || playerUserId || playerBoxId || previewSignedIn ? (
            <div className="accountArea" ref={accountRef}>
              <button
                className="siteAccount"
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                aria-expanded={accountOpen}
              >
                <span className="accountAvatar">
                  {playerAvatar && !verified ? <img src={playerAvatar} alt="" /> : <CircleUserRound size={18} />}
                </span>
                <span>{verified ? '服主' : playerName}</span>
              </button>
              {accountOpen ? (
                <aside className="accountMenu">
                  <div className="accountIdentity">
                    <strong>{verified ? '服主' : playerName}</strong>
                    {playerUserId ? <small>账号 ID · {playerUserId}</small> : null}
                    {playerBoxId ? <small>神岛 ID · {playerBoxId}</small> : null}
                  </div>
                  <button className="accountMenuAction" type="button" onClick={openProfileEditor}>
                    编辑资料
                  </button>
                  <button className="accountLogout" type="button" onClick={() => void logoutAccount()}>
                    退出登录
                  </button>
                </aside>
              ) : null}
            </div>
          ) : (
            <div className="guestActions" aria-label="账户入口">
              {uiPreview ? (
                <button className="guestLogin" type="button" onClick={previewSignIn}>
                  登录 / 注册
                </button>
              ) : (
                <Link className="guestLogin" href="/login-required?source=play">
                  登录 / 注册
                </Link>
              )}
            </div>
          )}
        </header>

        <div className="header">
          <div className="title">
            <h1>地图</h1>
            <span>
              {verified
                ? `${worldGroups.length} 个地图组 · ${worldList.length} 张地图`
                : `${worldGroups.length} 个地图`}
            </span>
          </div>
          <div className="headerActions">
            {adminToolsVisible ? (
              verified ? (
                <>
                  <button
                    className="button primary"
                    disabled={Boolean(busy)}
                    onClick={() => importInput.current?.click()}
                  >
                    <Upload size={16} />
                    {busy === 'import' ? '导入中…' : '导入地图组游玩包'}
                  </button>
                  <button className="button" onClick={exitAdmin}>
                    <LogOut size={16} />
                    退出管理
                  </button>
                </>
              ) : (
                <button className="button" onClick={openAdminTools}>
                  <Settings size={16} />
                  服主管理
                </button>
              )
            ) : null}
          </div>
          <input
            ref={importInput}
            className="hidden"
            type="file"
            accept=".boxplay,.tar.gz,.tgz,application/gzip"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (file) importBundle(file)
            }}
          />
        </div>

        {!verified && libraryEnabled && worldList.length ? (
          <nav className="collectionNav">
            <button
              className={collectionView === 'all' ? 'active' : ''}
              onClick={() => setCollectionView('all')}
            >
              全部
            </button>
            <button
              className={collectionView === 'recent' ? 'active' : ''}
              onClick={() => setCollectionView('recent')}
            >
              最近游玩
            </button>
            <button
              className={collectionView === 'favorites' ? 'active' : ''}
              onClick={() => setCollectionView('favorites')}
            >
              收藏
            </button>
          </nav>
        ) : null}

        {notice ? (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </div>
        ) : null}

        {worldList.length && !verified ? (
          playerGroups.length ? (
            <div className="playerGrid" aria-label="地图列表">
              {libraryGroups.map(({ groupId, main }) => (
                <article className="card" key={groupId}>
                  {libraryEnabled ? <button className="favoriteButton" aria-label="收藏作品" onClick={() => toggleFavorite(main.publicId)}>{favoriteIds.has(main.publicId) ? '★' : '☆'}</button> : null}
                  {!isPlayEnabled(main) ? <span className="mapClosed">暂时关闭</span> : null}
                  <Link className="cardLink" href={`/p/${encodeURIComponent(main.publicId)}`} onClick={(event) => {
                    if (!isPlayEnabled(main)) {
                      event.preventDefault()
                      return
                    }
                    recordRecent(main.publicId)
                  }}>
                    <div className="cover">{main.cover ? <img src={main.cover} alt="" /> : <span>{main.name.slice(0, 1)}</span>}{liveMapStats[main.publicId] ? <span className="mapOnline">{liveMapStats[main.publicId].onlineCount} 人在线</span> : null}</div>
                    <div className="info"><strong>{main.name}</strong><small>{main.author || '未署名'} · {main.version}</small>{main.description ? <p>{main.description}</p> : null}<span className="playCta">开始游玩 <ArrowUpRight size={15} aria-hidden="true" /></span></div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty"><strong>没有符合条件的地图</strong><small>试试切换到“全部”或“最近游玩”。</small></div>
          )
        ) : worldList.length ? (
          <div className="groups">
            {worldGroups.map(({ groupId, main, submaps }) => {
              const resources = [main, ...submaps]
                .map((world) => resourceStatuses[world.id])
                .filter((status): status is MapResourceStatus => Boolean(status))
              const totalBytes = resources.reduce((total, status) => total + status.bytes, 0)
              const importTimes = resources.map((status) => status.importedAt).sort()
              const latestImport = importTimes[importTimes.length - 1]
              return (
                <section className="mapGroup" key={groupId} aria-label={`${main.name}地图组`}>
                <header className="groupHeader">
                  <div className="groupIdentity">
                    <div>
                      <strong>{main.name}</strong>
                      <small>1 张主地图 · {submaps.length} 张副地图</small>
                      {verified && resources.length ? (
                        <small className="resourceStatus">
                          {main.version || '未标记版本'} · {formatBytes(totalBytes)} · 导入于 {formatImportedAt(latestImport || '')}
                        </small>
                      ) : null}
                    </div>
                  </div>
                  {verified ? (
                    <label className="groupAvailability">
                      <input
                        type="checkbox"
                        checked={isPlayEnabled(main)}
                        disabled={Boolean(busy)}
                        onChange={() => void toggleWorldAvailability(main)}
                        aria-label={isPlayEnabled(main) ? '关闭地图组' : '启动地图组'}
                      />
                      <i aria-hidden="true" />
                    </label>
                  ) : null}
                </header>
                <div className="mapTree">
                  <div className="mainMap">
                    <span className="roleLabel mainRole">主地图</span>
                    <article className="card">
                      <Link className="cardLink" href={`/p/${encodeURIComponent(main.publicId)}`}>
                        <div className="cover">
                          {main.cover ? (
                            <img src={main.cover} alt="" />
                          ) : (
                            <span>{main.name.slice(0, 1)}</span>
                          )}
                        </div>
                        <div className="info">
                          <strong>{main.name}</strong>
                          <small>
                            {main.author || '未署名'} · {main.version}
                          </small>
                          {main.description ? <p>{main.description}</p> : null}
                          <span className="playCta">
                            打开地图
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                      {verified ? (
                        <div className="cardActions">
                          <button disabled={Boolean(busy)} onClick={() => openWorldEditor(main)}>
                            地图设置
                          </button>
                          <button
                            className="dangerText"
                            disabled={Boolean(busy)}
                            onClick={() => requestDelete(main)}
                          >
                            删除地图组
                          </button>
                        </div>
                      ) : null}
                    </article>
                  </div>

                  {submaps.length ? (
                    <div className="submapBranch">
                      <div className="branchHeading">
                        <span>副地图</span>
                        <small>共享本地图组资源</small>
                      </div>
                      <div className="submapGrid">
                        {submaps.map((world, index) => (
                          <div className="submapItem" key={world.id}>
                            <span className="roleLabel">
                              副地图 {String(index + 1).padStart(2, '0')}
                            </span>
                            <article className="card">
                              <Link
                                className="cardLink"
                                href={`/p/${encodeURIComponent(world.publicId)}`}
                              >
                                <div className="cover">
                                  {world.cover ? (
                                    <img src={world.cover} alt="" />
                                  ) : (
                                    <span>{world.name.slice(0, 1)}</span>
                                  )}
                                </div>
                                <div className="info">
                                  <strong>{world.name}</strong>
                                  <small>
                                    {world.author || '未署名'} · {world.version}
                                  </small>
                                  {world.description ? <p>{world.description}</p> : null}
                                  <span className="playCta">
                                    打开地图
                                    <ArrowUpRight size={15} aria-hidden="true" />
                                  </span>
                                </div>
                              </Link>
                              {verified ? (
                                <div className="cardActions">
                                  <button
                                    disabled={Boolean(busy)}
                                    onClick={() => openWorldEditor(world)}
                                  >
                                    地图设置
                                  </button>
                                  <button
                                    className="dangerText"
                                    disabled={Boolean(busy)}
                                    onClick={() => requestDelete(world)}
                                  >
                                    删除副地图
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            <strong>暂无地图</strong>
            <small>导入地图后会显示在这里</small>
            {verified ? (
              <button className="button primary" onClick={() => importInput.current?.click()}>
                导入地图组游玩包
              </button>
            ) : null}
          </div>
        )}
      </main>

      {loginOpen ? (
        <div className="backdrop playWorkOverlay" onMouseDown={() => setLoginOpen(false)}>
          <form
            className="dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              setBusy('verify')
              setNotice('')
              verifyToken(adminToken)
                .catch((error) => setNotice(error.message))
                .finally(() => setBusy(''))
            }}
          >
            <h2>服主验证</h2>
            <label>管理密钥</label>
            <input
              autoFocus
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
            />
            <div className="dialogActions">
              <button className="button" type="button" onClick={() => setLoginOpen(false)}>
                取消
              </button>
              <button
                className="button primary"
                disabled={!adminToken || busy === 'verify'}
                type="submit"
              >
                {busy === 'verify' ? '验证中…' : '验证'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {profileOpen ? (
        <div className="backdrop playWorkOverlay" onMouseDown={() => !profileSaving && setProfileOpen(false)}>
          <form className="dialog profileDialog" onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()}>
            <header className="profileDialogHeading">
              <div>
                <h2>编辑资料</h2>
                <p>设置在游玩端公开显示的资料</p>
              </div>
              <button className="profileClose" type="button" aria-label="关闭编辑资料" disabled={profileSaving} onClick={() => setProfileOpen(false)}><X size={17} /></button>
            </header>
            <div className="profileContent">
              <div className="profileAvatarRow">
                <div className="profileAvatarPreview" aria-label="头像预览">
                  {profileAvatar ? <img src={profileAvatar} alt="" /> : <CircleUserRound size={26} />}
                </div>
                <div className="profileAvatarCopy"><strong>头像</strong><small>PNG、JPEG、WebP、GIF · 最大 512 KB</small></div>
                <button className="profileAvatarUpload" type="button" onClick={() => avatarInput.current?.click()}>
                  更换头像
                </button>
              </div>
              <input
                ref={avatarInput}
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  selectProfileAvatar(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
              <label className="profileField" htmlFor="player-profile-name">
                <span>昵称</span>
                <input id="player-profile-name" autoFocus maxLength={32} value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <fieldset className="profileSkinField">
                <legend>游戏角色</legend>
                <div className="profileSkinOptions">
                  {builtInSkinOptions.map((skin) => (
                    <button
                      key={skin.id}
                      className={`profileSkinOption${profileSkinId === skin.id ? ' selected' : ''}`}
                      type="button"
                      aria-pressed={profileSkinId === skin.id}
                      onClick={() => setProfileSkinId(skin.id)}
                    >
                      <img src={skin.preview} alt="" />
                      <span>{skin.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <footer className="dialogActions">
              <button className="button" type="button" disabled={profileSaving} onClick={() => setProfileOpen(false)}>取消</button>
              <button className="button primary" type="submit" disabled={profileSaving || !profileName.trim()}>{profileSaving ? '保存中…' : '保存资料'}</button>
            </footer>
          </form>
        </div>
      ) : null}

      {deleteWorld ? (
        <div
          className="backdrop playWorkOverlay"
          onMouseDown={() => {
            setDeleteConfirmed(false)
            setDeleteWorld(null)
          }}
        >
          <div className="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{deleteTargets.length > 1 ? '删除地图组' : '删除地图'}</h2>
            <p>
              {deleteTargets.length > 1
                ? `将永久删除主地图及 ${deleteTargets.length - 1} 张副地图，玩家将无法再进入这些地图。`
                : `将永久删除“${deleteWorld.name}”，玩家将无法再进入该地图。`}
            </p>
            <ul className="deleteImpactList">
              {deleteTargets.map((world) => (
                <li key={world.id}>
                  <span>{world.mapRole === 'main' ? '主地图' : '副地图'}</span>
                  {world.name}
                </li>
              ))}
            </ul>
            <label className="deleteConfirm">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
              />
              我已确认删除，且无法恢复
            </label>
            <div className="dialogActions">
              <button
                className="button"
                onClick={() => {
                  setDeleteConfirmed(false)
                  setDeleteWorld(null)
                }}
              >
                取消
              </button>
              <button
                className="button danger"
                disabled={!deleteConfirmed || busy === `delete:${deleteWorld.id}`}
                onClick={confirmDelete}
              >
                {busy === `delete:${deleteWorld.id}` ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editWorld ? (
        <div
          className="backdrop playWorkOverlay"
          onMouseDown={() => {
            if (!busy) setEditWorld(null)
          }}
        >
          <form
            className="dialog editDialog"
            onSubmit={saveWorld}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>地图设置</h2>
            <label htmlFor="play-world-id">访问 ID</label>
            <input id="play-world-id" maxLength={63} spellCheck={false} value={editPublicId} onChange={(event) => setEditPublicId(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <small className="fieldHint">访问链接：/p/{editPublicId || '访问-id'} · 当前游玩端中必须唯一</small>
            <div className="dialogActions">
              <button
                className="button"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setEditWorld(null)}
              >
                取消
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={Boolean(busy) || !editPublicId.trim()}
              >
                {busy === `edit:${editWorld.id}` ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {importProgress ? (
        <div className="progressBackdrop playWorkOverlay">
          <section
            className="progressDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="play-import-title"
          >
            <div
              className={`progressIcon ${importProgress.phase === 'done' ? 'done' : importProgress.phase === 'error' ? 'error' : ''}`}
            >
              {importProgress.phase === 'done' ? '✓' : importProgress.phase === 'error' ? '!' : '↑'}
            </div>
            <h2 id="play-import-title">
              {importProgress.phase === 'uploading'
                ? '正在上传游玩包'
                : importProgress.phase === 'processing'
                  ? '正在导入地图组作品'
                  : importProgress.phase === 'done'
                    ? '导入完成'
                    : '导入失败'}
            </h2>
            <p className="progressFilename">
              {importProgress.worldName || importProgress.filename}
              {importProgress.phase === 'done' && importProgress.mapCount
                ? ` · ${importProgress.mapCount} 张地图`
                : ''}
            </p>
            <div
              className="progressTrack"
              aria-label="游玩包导入进度"
              aria-valuenow={Math.round(importProgress.percent)}
              role="progressbar"
            >
              <span style={{ width: `${importProgress.percent}%` }} />
            </div>
            <div className="progressMeta" aria-live="polite">
              <strong>{Math.round(importProgress.percent)}%</strong>
              <span>
                {importProgress.phase === 'uploading'
                  ? `${formatBytes(importProgress.sent)} / ${formatBytes(importProgress.total)} · ${importProgress.elapsedSeconds}s`
                  : importProgress.phase === 'processing'
                    ? `正在解压、校验主副关系并原子写入游玩目录 · ${importProgress.elapsedSeconds}s`
                    : importProgress.phase === 'done'
                      ? `${formatBytes(importProgress.total)} · 用时 ${importProgress.elapsedSeconds}s`
                      : importProgress.message}
              </span>
            </div>
            {importProgress.details?.length ? (
              <div className="importDiagnostics" role="log" aria-label="游玩包检查详情">
                <div className="importDiagnosticsHeader">
                  <strong>检查详情</strong>
                  <span>{importProgress.details.length} 项</span>
                </div>
                <ul>
                  {importProgress.details.map((detail, index) => (
                    <li key={`${detail.code || 'detail'}-${index}`} data-level={detail.level}>
                      <span>{detail.level === 'error' ? '错误' : '提醒'}</span>
                      <p>{detail.message}</p>
                      {detail.code ? <code>{detail.code}</code> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {importProgress.phase === 'done' || importProgress.phase === 'error' ? (
              <button
                className="progressClose"
                type="button"
                onClick={() => setImportProgress(null)}
              >
                {importProgress.phase === 'done' ? '完成' : '关闭'}
              </button>
            ) : null}
          </section>
        </div>
      ) : null}

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }
        :global(body) {
          margin: 0;
          background: #f7f7f8;
          color: #202124;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        button,
        input {
          font: inherit;
        }
        .page {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto;
          padding: 20px 0 80px;
        }
        .siteHeader {
          display: flex;
          min-height: 56px;
          align-items: center;
          gap: 28px;
          margin-bottom: 38px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .siteBrand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          font-size: 17px;
          font-weight: 750;
          letter-spacing: -0.03em;
          text-decoration: none;
        }
        .siteMark {
          display: grid;
          width: 22px;
          height: 22px;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          transform: rotate(30deg) skewY(-10deg);
        }
        .siteMark i {
          border-radius: 3px;
          background: #ffdb00;
        }
        .siteMark i:nth-child(2) {
          background: #ffac21;
        }
        .siteMark i:nth-child(3) {
          grid-column: span 2;
          background: #ff7131;
        }
        .siteNav {
          display: flex;
          height: 56px;
          align-items: center;
          gap: 4px;
        }
        .siteNav a {
          display: inline-flex;
          height: 56px;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          color: rgba(255, 255, 255, 0.54);
          font-size: 13px;
          text-decoration: none;
        }
        .siteNav .siteNavCurrent {
          color: #fff;
          box-shadow: inset 0 -2px #ffdb00;
        }
        .siteAccount {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }
        .accountAvatar {
          display: grid;
          width: 29px;
          height: 29px;
          place-items: center;
          border-radius: 50%;
          color: #262626;
          background: #ffdb00;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }
        .title {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .title h1 {
          font-size: 26px;
          margin: 0;
        }
        .title span {
          font-size: 13px;
          color: #85888f;
        }
        .headerActions {
          display: flex;
          gap: 8px;
        }
        .button {
          display: inline-flex;
          height: 36px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          border: 1px solid #d9dadd;
          border-radius: 7px;
          background: #fff;
          color: #303238;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
            background-color 140ms ease,
            border-color 140ms ease;
        }
        .button:hover {
          background: #f3f4f5;
        }
        .button:active {
          transform: scale(0.97);
        }
        .button:disabled {
          cursor: default;
          opacity: 0.55;
          transform: none;
        }
        .button.primary {
          border-color: #1f2329;
          background: #1f2329;
          color: #fff;
        }
        .button.primary:hover {
          background: #34383f;
        }
        .button.danger {
          border-color: #d94343;
          background: #d94343;
          color: #fff;
        }
        .hidden {
          display: none;
        }
        .notice {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: -8px 0 18px;
          padding: 10px 12px;
          border: 1px solid #efd0d0;
          border-radius: 7px;
          background: #fff5f5;
          color: #b42323;
          font-size: 13px;
        }
        .notice button {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
        }
        .playerGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 18px;
        }
        .groups {
          display: grid;
          gap: 20px;
        }
        .mapGroup {
          padding: 18px;
          border: 1px solid #e1e3e7;
          border-radius: 12px;
          background: #fff;
        }
        .groupHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eceef1;
        }
        .groupIdentity {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }
        .groupIdentity > div {
          display: grid;
          min-width: 0;
          gap: 4px;
        }
        .groupIdentity strong {
          overflow: hidden;
          font-size: 16px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .groupIdentity small,
        .branchHeading small {
          color: #85888f;
          font-size: 12px;
        }
        .groupIdentity .resourceStatus {
          color: #6e737b;
          font-size: 11px;
        }
        .groupBadge {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 6px;
          color: #fff;
          background: #282c32;
          font-size: 11px;
          font-weight: 700;
        }
        .groupAvailability {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 9px;
          color: #62666d;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }
        .groupAvailability input {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
        }
        .groupAvailability i {
          position: relative;
          width: 34px;
          height: 20px;
          border-radius: 999px;
          background: #b8bdc4;
          transition: background-color 150ms ease;
        }
        .groupAvailability i::after {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
          content: '';
          transition: transform 150ms ease;
        }
        .groupAvailability input:checked + i { background: #ffdb00; }
        .groupAvailability input:checked + i::after { transform: translateX(14px); }
        .groupAvailability input:focus-visible + i { outline: 2px solid #285fe8; outline-offset: 3px; }
        .groupAvailability input:disabled + i { opacity: 0.55; }
        .groupAvailability:has(input:disabled) { cursor: default; }
        .mapTree {
          padding-top: 16px;
        }
        .mainMap,
        .submapItem {
          position: relative;
          padding-top: 25px;
        }
        .roleLabel {
          position: absolute;
          z-index: 2;
          top: 0;
          left: 12px;
          color: #777c84;
          font-size: 11px;
          font-weight: 700;
        }
        .mainRole {
          color: #20242a;
        }
        .mainMap {
          width: min(100%, 360px);
        }
        .submapBranch {
          position: relative;
          margin: 18px 0 0 38px;
          padding: 0 0 0 28px;
          border-left: 2px solid #d8dbe0;
        }
        .submapBranch::before {
          position: absolute;
          top: -18px;
          left: -2px;
          width: 28px;
          height: 34px;
          border-bottom: 2px solid #d8dbe0;
          content: '';
        }
        .branchHeading {
          display: flex;
          align-items: baseline;
          gap: 9px;
          margin: 0 0 10px;
        }
        .branchHeading span {
          font-size: 13px;
          font-weight: 700;
        }
        .submapGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 14px;
        }
        .submapItem::before {
          position: absolute;
          top: 11px;
          left: -30px;
          width: 20px;
          border-top: 2px solid #d8dbe0;
          content: '';
        }
        .card {
          overflow: hidden;
          background: #fff;
          border: 1px solid #e6e7e9;
          border-radius: 10px;
          transition:
            border-color 0.15s,
            transform 0.15s,
            box-shadow 0.15s;
        }
        .mainMap .card {
          border-color: #b9bdc4;
          box-shadow: 0 2px 10px rgba(28, 32, 38, 0.06);
        }
        .submapItem .card {
          background: #fcfcfd;
        }
        .card:hover {
          border-color: #aeb2b9;
          box-shadow: 0 8px 22px rgba(28, 32, 38, 0.08);
          transform: translateY(-2px);
        }
        .cardLink {
          display: block;
          color: inherit;
          text-decoration: none;
        }
        .cover {
          position: relative;
          aspect-ratio: 16/9;
          background: #eceef1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a2a6ad;
          font-size: 32px;
        }
        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info {
          padding: 14px;
        }
        .info strong {
          display: block;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info small {
          display: block;
          color: #85888f;
          margin-top: 6px;
        }
        .info p {
          margin: 10px 0 0;
          color: #5e6269;
          font-size: 13px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cardActions {
          display: flex;
          border-top: 1px solid #ececef;
        }
        .cardActions button {
          flex: 1;
          height: 38px;
          border: 0;
          background: #fff;
          color: #555960;
          font-size: 13px;
          cursor: pointer;
        }
        .cardActions button + button {
          border-left: 1px solid #ececef;
        }
        .cardActions button:hover {
          background: #f6f6f7;
        }
        .cardActions .dangerText {
          color: #cf3939;
        }
        .empty {
          min-height: 164px;
          padding: 54px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          text-align: center;
          color: #92959b;
          background: #fff;
          border: 1px solid #e6e7e9;
          border-radius: 10px;
        }
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.65);
        }
        .dialog {
          width: min(400px, 100%);
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: #262626;
          border-radius: 8px;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.5);
        }
        .editDialog {
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
        }
        .dialog h2 {
          margin: 0 0 20px;
          font-size: 19px;
        }
        .dialog p {
          margin: 0 0 22px;
          color: #5d6168;
          font-size: 14px;
          line-height: 1.6;
        }
        .dialog label {
          display: block;
          margin: 13px 0 8px;
          color: #555960;
          font-size: 13px;
        }
        .dialog input,
        .dialog textarea {
          width: 100%;
          padding: 0 11px;
          border: 1px solid #d6d8dc;
          border-radius: 6px;
          outline: none;
          background: #fff;
          color: #303238;
        }
        .dialog input {
          height: 40px;
        }
        .dialog textarea {
          min-height: 82px;
          padding-top: 9px;
          resize: vertical;
          font: inherit;
        }
        .dialog input:focus,
        .dialog textarea:focus {
          border-color: #7a7f87;
          box-shadow: 0 0 0 3px rgba(40, 44, 50, 0.08);
        }
        .dialog input[type='file'] {
          height: auto;
          padding: 7px;
        }
        .fieldHint {
          display: block;
          margin-top: 7px;
          color: #85888f;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .dialogActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 22px;
        }
        .progressBackdrop {
          position: fixed;
          z-index: 30;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.66);
        }
        .progressDialog {
          width: min(100%, 520px);
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          color: #fff;
          background: #262626;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.5);
        }
        .progressIcon {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-radius: 9px;
          color: #262626;
          background: #ffdb00;
          font-size: 24px;
          font-weight: 800;
        }
        .progressIcon.done {
          color: #fff;
          background: #78c95d;
        }
        .progressIcon.error {
          color: #fff;
          background: #f65252;
        }
        .progressDialog h2 {
          margin: 18px 0 6px;
          font-size: 20px;
        }
        .progressFilename {
          overflow: hidden;
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .progressTrack {
          overflow: hidden;
          height: 8px;
          margin-top: 24px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
        }
        .progressTrack span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #ffdb00;
          transition: width 260ms ease;
        }
        .progressMeta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-top: 10px;
        }
        .progressMeta strong {
          flex: 0 0 auto;
          color: #ffdb00;
          font-size: 13px;
        }
        .progressMeta span {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          line-height: 1.55;
          text-align: right;
          word-break: break-all;
        }
        .importDiagnostics {
          max-height: min(310px, 38vh);
          overflow: hidden;
          margin-top: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9px;
          background: #303030;
        }
        .importDiagnosticsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .importDiagnosticsHeader strong {
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
        }
        .importDiagnosticsHeader span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 11px;
        }
        .importDiagnostics ul {
          display: grid;
          max-height: min(260px, 31vh);
          overflow-y: auto;
          margin: 0;
          padding: 5px 0;
          list-style: none;
        }
        .importDiagnostics li {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 3px 9px;
          padding: 8px 12px;
        }
        .importDiagnostics li + li {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .importDiagnostics li > span {
          align-self: start;
          min-width: 34px;
          padding: 2px 5px;
          border-radius: 4px;
          color: #fff;
          background: #d94b4b;
          font-size: 10px;
          line-height: 1.35;
          text-align: center;
        }
        .importDiagnostics li[data-level='warning'] > span {
          color: #2b2600;
          background: #ffdb00;
        }
        .importDiagnostics p {
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          line-height: 1.55;
          text-align: left;
          word-break: break-word;
        }
        .importDiagnostics code {
          grid-column: 2;
          color: rgba(255, 255, 255, 0.38);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
        }
        .progressClose {
          display: flex;
          min-width: 88px;
          height: 36px;
          align-items: center;
          justify-content: center;
          margin: 24px 0 0 auto;
          border: 0;
          border-radius: 7px;
          color: #262626;
          background: #ffdb00;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .progressClose:hover {
          background: #ffe44d;
        }
        /* Shared product shell: one restrained dark palette, compact surfaces,
           and yellow reserved for the primary action or current selection. */
        :global(body) {
          background: #262626;
          color: #f5f5f5;
        }
        .playWorkCenter.page {
          width: min(1150px, calc(100% - 32px));
          padding: 0 0 64px;
          color: rgba(255, 255, 255, 0.9);
        }
        .playWorkCenter .siteHeader {
          min-height: 64px;
          gap: 18px;
          margin: 0 0 28px;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .playWorkCenter .siteBrand {
          gap: 10px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .playWorkCenter .siteMark {
          display: block;
          flex: 0 0 auto;
          width: 26px;
          height: 26px;
          object-fit: contain;
          transform: none;
        }
        .accountArea {
          position: relative;
          margin-left: auto;
        }
        .playWorkCenter .siteAccount {
          height: 36px;
          gap: 7px;
          margin: 0;
          padding: 0 8px;
          border: 0;
          border-radius: 7px;
          color: rgba(255, 255, 255, 0.86);
          background: transparent;
          cursor: pointer;
          transition: background-color 140ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .siteAccount:hover { background: #404040; }
        .playWorkCenter .siteAccount:active { transform: scale(0.97); }
        .playWorkCenter .accountAvatar { width: 26px; height: 26px; color: #262626; background: #ffdb00; }
        .playWorkCenter .accountAvatar img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
        .playWorkCenter .guestActions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .playWorkCenter .guestActions :global(.guestLogin) { display: inline-flex; height: 36px; align-items: center; justify-content: center; padding: 0 15px; border-radius: 7px; font-size: 13px; font-weight: 700; line-height: 1; text-decoration: none; transition: background-color 140ms ease, border-color 140ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1); }
        .playWorkCenter .guestActions :global(.guestLogin) { color: #262626 !important; background: #ffdb00 !important; box-shadow: 0 0 0 1px rgba(255, 219, 0, 0.3); }
        .playWorkCenter .guestActions button:global(.guestLogin) { border: 0; cursor: pointer; }
        .playWorkCenter .guestActions :global(.guestLogin):hover { background: #ffe44d !important; }
        .playWorkCenter .guestActions :global(.guestLogin):active { transform: scale(0.97); }
        .playWorkCenter .accountMenu {
          position: absolute;
          z-index: 10;
          right: 0;
          top: 42px;
          min-width: 204px;
          padding: 14px;
          border-color: rgba(255, 255, 255, 0.13);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.64);
          background: #333;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
          transform-origin: top right;
          animation: account-menu-in 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .accountIdentity { display: grid; gap: 4px; }
        .playWorkCenter .accountMenu strong { color: #fff; font-size: 13px; }
        .playWorkCenter .accountMenu small { color: rgba(255, 255, 255, 0.45); font-size: 12px; }
        .playWorkCenter .accountMenuAction,
        .playWorkCenter .accountLogout {
          width: 100%;
          margin-top: 11px;
          padding: 0;
          border: 0;
          color: rgba(255, 255, 255, 0.6);
          background: transparent;
          font: inherit;
          font-size: 12px;
          text-align: left;
          cursor: pointer;
        }
        .playWorkCenter .accountMenuAction { color: rgba(255, 255, 255, 0.82); }
        .playWorkCenter .accountMenuAction:hover,
        .playWorkCenter .accountLogout:hover { color: #fff; }
        .playWorkOverlay .profileDialog {
          width: min(408px, 100%);
          padding: 0;
          overflow: hidden;
        }
        .playWorkOverlay .profileDialogHeading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin: 0;
          padding: 20px 20px 17px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .playWorkOverlay .profileDialogHeading h2 { margin: 0 0 4px; font-size: 18px; }
        .playWorkOverlay .profileDialogHeading p { margin: 0; font-size: 12px; line-height: 1.45; }
        .playWorkOverlay .profileClose {
          width: 30px;
          height: 30px;
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          margin: -4px -4px 0 0;
          padding: 0;
          border: 0;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.56);
          background: transparent;
          cursor: pointer;
          transition: color 140ms ease, background-color 140ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkOverlay .profileClose:hover { color: #fff; background: #404040; }
        .playWorkOverlay .profileClose:active { transform: scale(0.96); }
        .playWorkOverlay .profileContent { display: grid; gap: 18px; padding: 18px 20px 20px; }
        .playWorkOverlay .profileAvatarRow {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }
        .playWorkOverlay .profileAvatarPreview {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 50%;
          color: #262626;
          background: #ffdb00;
        }
        .playWorkOverlay .profileAvatarPreview img { width: 100%; height: 100%; object-fit: cover; }
        .playWorkOverlay .profileAvatarCopy { min-width: 0; display: grid; gap: 3px; flex: 1; }
        .playWorkOverlay .profileAvatarCopy strong { color: #fff; font-size: 13px; }
        .playWorkOverlay .profileAvatarCopy small { overflow: hidden; color: rgba(255, 255, 255, 0.43); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
        .playWorkOverlay .profileAvatarUpload {
          height: 30px;
          padding: 0 9px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.84);
          background: #404040;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .playWorkOverlay .profileAvatarUpload:hover { background: #4a4a4a; }
        .playWorkOverlay .profileField { display: grid; gap: 7px; margin: 0; }
        .playWorkOverlay .profileField > span { color: rgba(255, 255, 255, 0.58); font-size: 12px; font-weight: 600; }
        .playWorkOverlay .profileField input { height: 38px; }
        .playWorkOverlay .profileSkinField { min-width: 0; margin: 0; padding: 0; border: 0; }
        .playWorkOverlay .profileSkinField legend { margin-bottom: 8px; padding: 0; color: rgba(255, 255, 255, 0.58); font-size: 12px; font-weight: 600; }
        .playWorkOverlay .profileSkinOptions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .playWorkOverlay .profileSkinOption {
          display: grid;
          gap: 5px;
          min-width: 0;
          padding: 6px 4px 7px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 7px;
          color: rgba(255, 255, 255, 0.62);
          background: #353535;
          font: inherit;
          font-size: 10px;
          cursor: pointer;
          transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease, transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkOverlay .profileSkinOption img { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 4px; background: #292929; }
        .playWorkOverlay .profileSkinOption:hover { border-color: rgba(255, 219, 0, 0.5); color: #fff; }
        .playWorkOverlay .profileSkinOption.selected { border-color: #ffdb00; color: #ffdb00; background: rgba(255, 219, 0, 0.08); }
        .playWorkOverlay .profileSkinOption:active { transform: scale(0.97); }
        .playWorkOverlay .profileDialog .dialogActions {
          margin: 0;
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: #2a2a2a;
        }
        .playWorkCenter .header { margin-bottom: 16px; }
        .playWorkCenter .title { gap: 10px; }
        .playWorkCenter .title h1 { color: #fff; font-size: 22px; letter-spacing: -0.025em; }
        .playWorkCenter .title span { color: rgba(255, 255, 255, 0.45); font-size: 13px; }
        .playWorkCenter .button {
          height: 38px;
          border-color: rgba(255, 255, 255, 0.14);
          border-radius: 7px;
          color: rgba(255, 255, 255, 0.84);
          background: #404040;
        }
        .playWorkCenter .button:hover { background: #4a4a4a; }
        .playWorkCenter .button.primary {
          border-color: #ffdb00;
          color: #262626;
          background: #ffdb00;
          font-weight: 700;
        }
        .playWorkCenter .button.primary:hover { background: #ffe44d; }
        .playWorkCenter .notice { border-color: rgba(246, 82, 82, 0.32); color: #ff9a9a; background: rgba(246, 82, 82, 0.08); }
        .playWorkCenter .collectionNav {
          gap: 4px;
          margin: 0 0 20px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .playWorkCenter .collectionNav button {
          height: 30px;
          padding: 0 10px;
          border: 0;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.55);
          background: transparent;
          font-size: 12px;
          cursor: pointer;
          transition: color 140ms ease, background-color 140ms ease;
        }
        .playWorkCenter .collectionNav button:hover { color: #fff; background: #404040; }
        .playWorkCenter .collectionNav button.active { color: #262626; background: #ffdb00; }
        .playWorkCenter .playerGrid {
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .playWorkCenter .groups {
          grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
          align-items: start;
          gap: 12px;
        }
        .playWorkCenter .mapGroup {
          padding: 14px;
          border-color: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: #333;
        }
        .playWorkCenter .groupHeader { border-color: rgba(255, 255, 255, 0.09); }
        .playWorkCenter .groupIdentity small,
        .playWorkCenter .branchHeading small,
        .playWorkCenter .roleLabel { color: rgba(255, 255, 255, 0.44); }
        .playWorkCenter .groupIdentity .resourceStatus { color: rgba(255, 255, 255, 0.36); }
        .playWorkCenter .groupBadge { color: #262626; background: #ffdb00; }
        .playWorkCenter .groupAvailability { color: rgba(255, 255, 255, 0.64); }
        .playWorkCenter .groupAvailability i { background: #626262; }
        .playWorkCenter .groupAvailability input:checked + i { background: #ffdb00; }
        .playWorkCenter .mainRole { color: #ffdb00; }
        .playWorkCenter .submapBranch,
        .playWorkCenter .submapBranch::before,
        .playWorkCenter .submapItem::before { border-color: rgba(255, 255, 255, 0.16); }
        .playWorkCenter .card {
          position: relative;
          border-color: rgba(255, 255, 255, 0.09);
          border-radius: 8px;
          background: #404040;
          box-shadow: none;
          transition: border-color 160ms ease, background-color 160ms ease, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .mainMap .card { border-color: rgba(255, 219, 0, 0.35); }
        .playWorkCenter .card:hover {
          border-color: rgba(255, 219, 0, 0.58);
          background: #484848;
          box-shadow: none;
        }
        .playWorkCenter .cover {
          color: rgba(255, 255, 255, 0.32);
          background: #333;
        }
        .playWorkCenter .info strong { color: #fff; }
        .playWorkCenter .info small { color: rgba(255, 255, 255, 0.45); }
        .playWorkCenter .info p { color: rgba(255, 255, 255, 0.58); }
        .playWorkCenter .playerGrid .card { min-height: 0; }
        .playWorkCenter .playerGrid .cover {
          aspect-ratio: 16 / 9;
          border-radius: 7px 7px 0 0;
        }
        .playWorkCenter .playerGrid .info { min-height: 128px; padding: 14px; }
        .playWorkCenter .playerGrid .info p { margin-top: 6px; }
        .playWorkCenter .mapOnline {
          position: absolute;
          bottom: 9px;
          left: 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.86);
          background: rgba(38, 38, 38, 0.76);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
          font-size: 11px;
          line-height: 1;
        }
        .playWorkCenter .playCta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 14px;
          color: #ffdb00;
          font-size: 12px;
          font-weight: 700;
        }
        .playWorkCenter .card:hover .playCta svg { transform: translate(2px, -2px); }
        .playWorkCenter .playCta svg { transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1); }
        .playWorkCenter .cardActions { border-color: rgba(255, 255, 255, 0.08); }
        .playWorkCenter .cardActions button { color: rgba(255, 255, 255, 0.68); background: #404040; }
        .playWorkCenter .cardActions button + button { border-color: rgba(255, 255, 255, 0.08); }
        .playWorkCenter .cardActions button:hover { background: #4a4a4a; }
        .playWorkCenter .favoriteButton {
          position: absolute;
          z-index: 2;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: #ffdb00;
          background: rgba(38, 38, 38, 0.8);
          transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease;
        }
        .playWorkCenter .favoriteButton:hover { background: #262626; }
        .playWorkCenter .favoriteButton:active { transform: scale(0.94); }
        .playWorkCenter .mapClosed {
          position: absolute;
          z-index: 3;
          top: 10px;
          left: 10px;
          padding: 5px 8px;
          border-radius: 5px;
          color: rgba(255, 255, 255, 0.84);
          background: rgba(38, 38, 38, 0.84);
          font-size: 11px;
        }
        .playWorkCenter .empty {
          min-height: 152px;
          align-items: flex-start;
          gap: 5px;
          padding: 24px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #d9dade;
          background: transparent;
          text-align: left;
        }
        .playWorkCenter .empty small { color: rgba(255, 255, 255, 0.5); }
        .playWorkCenter .empty .button { margin-top: 12px; }
        .playWorkOverlay .dialog,
        .playWorkOverlay .progressDialog {
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 8px;
          color: #fff;
          background: #262626;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.48);
        }
        .playWorkOverlay .dialog h2 { color: #fff; }
        .playWorkOverlay .dialog p,
        .playWorkOverlay .dialog label { color: rgba(255, 255, 255, 0.62); }
        .playWorkOverlay .deleteImpactList {
          display: grid;
          gap: 6px;
          max-height: 152px;
          overflow-y: auto;
          margin: -7px 0 18px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          background: #333;
          list-style: none;
        }
        .playWorkOverlay .deleteImpactList li {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.74);
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .playWorkOverlay .deleteImpactList span {
          display: inline-block;
          min-width: 42px;
          margin-right: 8px;
          color: rgba(255, 219, 0, 0.88);
          font-size: 10px;
        }
        .playWorkOverlay .deleteConfirm {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          cursor: pointer;
        }
        .playWorkOverlay .deleteConfirm input {
          width: 15px;
          height: 15px;
          accent-color: #ffdb00;
        }
        .playWorkOverlay .dialog input,
        .playWorkOverlay .dialog textarea { border-color: rgba(255, 255, 255, 0.18); color: #fff; background: #404040; }
        .playWorkOverlay .dialog input:focus,
        .playWorkOverlay .dialog textarea:focus { border-color: #ffdb00; box-shadow: 0 0 0 3px rgba(255, 219, 0, 0.14); }
        .playWorkOverlay .fieldHint { color: rgba(255, 255, 255, 0.42); }
        .playWorkOverlay .editDialog { width: min(420px, 100%); padding: 20px; }
        .playWorkOverlay .editDialog h2 { margin-bottom: 18px; font-size: 20px; letter-spacing: -0.02em; }
        .playWorkOverlay .editDialog label { margin-top: 14px; font-weight: 600; }
        .playWorkOverlay .editDialog .fieldHint { margin-top: 6px; font-size: 10px; }
        .playWorkOverlay .editDialog input[type='file'] { height: 44px; padding: 5px; cursor: pointer; }
        .playWorkOverlay .editDialog input[type='file']::file-selector-button {
          height: 30px;
          margin-right: 9px;
          padding: 0 10px;
          border: 0;
          border-radius: 5px;
          color: rgba(255, 255, 255, 0.86);
          background: #505050;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .playWorkOverlay .editDialog input[type='file']::file-selector-button:hover { background: #5a5a5a; }
        .playWorkOverlay .editDialog .dialogActions {
          margin: 20px -20px -20px;
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: #2a2a2a;
        }
        .playWorkOverlay .button {
          height: 38px;
          border-color: rgba(255, 255, 255, 0.14);
          border-radius: 7px;
          color: rgba(255, 255, 255, 0.84);
          background: #404040;
        }
        .playWorkOverlay .button:hover { background: #4a4a4a; }
        .playWorkOverlay .button.primary {
          border-color: #ffdb00;
          color: #262626;
          background: #ffdb00;
          font-weight: 700;
        }
        .playWorkOverlay .button.primary:hover { background: #ffe44d; }
        .playWorkOverlay .button.danger { border-color: #f65252; color: #fff; background: #d84545; }
        .playWorkOverlay .button.danger:hover { background: #ee5757; }
        @keyframes account-menu-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (hover: hover) and (pointer: fine) { .playWorkCenter .card:hover { transform: translateY(-2px); } }
        @media (hover: none), (pointer: coarse) { .playWorkCenter .card:hover { transform: none; } }
        @media (prefers-reduced-motion: reduce) { .playWorkCenter .card, .groupAvailability i, .groupAvailability i::after { transition: none; } }
        @media (max-width: 640px) {
          .page {
            width: min(100% - 24px, 1120px);
            padding-top: 12px;
          }
          .siteHeader {
            gap: 12px;
            margin-bottom: 28px;
          }
          .siteNav {
            display: none;
          }
          .siteAccount {
            font-size: 12px;
          }
          .header {
            align-items: flex-start;
            flex-direction: column;
          }
          .headerActions {
            width: 100%;
            flex-wrap: wrap;
          }
          .playWorkCenter .playerGrid {
            grid-template-columns: 1fr;
          }
          .playWorkCenter .groups {
            grid-template-columns: 1fr;
          }
          .mapGroup {
            padding: 14px;
          }
          .groupHeader {
            align-items: flex-start;
            flex-direction: column;
          }
          .mainMap {
            width: 100%;
          }
          .submapBranch {
            margin-left: 12px;
            padding-left: 18px;
          }
          .submapItem::before {
            left: -20px;
            width: 12px;
          }
          .submapGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return { redirect: { destination: '/players', permanent: false } }
  }
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play') {
    return { redirect: { destination: '/projects', permanent: false } }
  }
  // Only used by the local UI development server. Production play deployments
  // never set this flag, so their player authentication flow is unchanged.
  if (process.env.NODE_ENV === 'development' && process.env.BOX_UI_PREVIEW === 'true') {
    const worlds = getPlayWorlds()
    return {
      props: {
        worlds: worlds.length ? worlds : previewWorlds,
        adminEnabled: isPlayAdminEnabled(),
        adminToolsVisible: true,
        uiPreview: true,
        mapStats: previewMapStats,
      },
    }
  }
  if (!process.env.BOX_PLAY_LIBRARY_PATH) {
    return {
      redirect: {
        destination: `/p/${encodeURIComponent(process.env.BOX_WORLD_PUBLIC_ID || process.env.BOX_WORLD_ID || 'local')}`,
        permanent: false,
      },
    }
  }
  const worlds = getPlayWorlds()
  const groupByMap = Object.fromEntries(
    worlds.map((world) => [world.publicId, world.mapGroupId || world.mainProjectId || world.id]),
  )
  return {
    props: {
      worlds,
      adminEnabled: isPlayAdminEnabled(),
      adminToolsVisible: isPlayAdminEnabled(),
      uiPreview: false,
      mapStats: getPlayPresenceCounts(worlds.map((world) => world.publicId), groupByMap),
    },
  }
}
