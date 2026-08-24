import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleUserRound, LogOut, Settings, Upload } from 'lucide-react'
import type { PlayWorld } from '../server/play-worlds'
import { getPlayWorlds } from '../server/play-worlds'
import { isPlayAdminEnabled } from '../server/play-admin-security'
import {
  importResponseError,
  type DetailedImportError,
  type ImportDiagnostic,
} from '../server/import-diagnostics'

const TOKEN_KEY = 'box-play-admin-token'

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

function formatBytes(value: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`
}

export default function HomePage({
  worlds,
  adminEnabled,
}: {
  worlds: PlayWorld[]
  adminEnabled: boolean
}) {
  const importInput = useRef<HTMLInputElement>(null)
  const [worldList, setWorldList] = useState(worlds)
  const [adminToken, setAdminToken] = useState('')
  const [verified, setVerified] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [playerBoxId, setPlayerBoxId] = useState('')
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)
  const [libraryEnabled, setLibraryEnabled] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'favorites'>('all')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [loginOpen, setLoginOpen] = useState(false)
  const [deleteWorld, setDeleteWorld] = useState<PlayWorld | null>(null)
  const [editWorld, setEditWorld] = useState<PlayWorld | null>(null)
  const [editPublicId, setEditPublicId] = useState('')
  const [editName, setEditName] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCover, setEditCover] = useState('')
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
    fetch('/api/play-library')
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        setPlayerName(data.player?.displayName || data.player?.username || '')
        setPlayerBoxId(data.player?.boxId || '')
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
  }, [])

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
  const playerGroups =
    collectionView === 'favorites'
      ? worldGroups.filter(({ main }) => favoriteIds.has(main.publicId))
      : collectionView === 'recent'
        ? [...worldGroups]
            .sort((a, b) => recentIds.indexOf(a.main.publicId) - recentIds.indexOf(b.main.publicId))
            .filter(({ main }) => recentIds.includes(main.publicId))
        : worldGroups

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

  async function exportBundle(world: PlayWorld) {
    setBusy(`export:${world.id}`)
    setNotice('')
    try {
      const response = await fetch(
        `/api/play-admin/worlds/${encodeURIComponent(world.id)}/export`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '导出失败')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1]
      const filename = encodedName
        ? decodeURIComponent(encodedName)
        : `${world.name}_${world.id}.boxplay`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setNotice((error as Error).message)
    } finally {
      setBusy('')
    }
  }

  async function confirmDelete() {
    if (!deleteWorld) return
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

  function openWorldEditor(world: PlayWorld) {
    setEditWorld(world)
    setEditPublicId(world.publicId)
    setEditName(world.name)
    setEditAuthor(world.author || '')
    setEditDescription(world.description || '')
    setEditCover(world.cover || '')
    setNotice('')
  }

  async function saveWorld(event: FormEvent) {
    event.preventDefault()
    if (!editWorld) return
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
          name: editName,
          author: editAuthor,
          description: editDescription,
          cover: editCover,
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

  return (
    <>
      <Head>
        <title>游玩作品中心</title>
      </Head>
      <main className="page playWorkCenter">
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
            <span className="siteMark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="siteBrandName" style={{ color: '#f5f5f5' }}>
              BOX3 Engine
            </span>
          </Link>

          <div className="accountArea" ref={accountRef}>
            <button
              className="siteAccount"
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
            >
              <span className="accountAvatar">
                <CircleUserRound size={18} />
              </span>
              <span>{verified ? '服主' : playerName || '账户'}</span>
            </button>
            {accountOpen ? (
              <aside className="accountMenu">
                <strong>{playerName || '账户'}</strong>
                {playerBoxId ? <small>神岛 ID · {playerBoxId}</small> : null}
                {libraryEnabled ? (
                  <span>
                    收藏 {favoriteCount} · 最近游玩 {recentCount}
                  </span>
                ) : null}
              </aside>
            ) : null}
          </div>
        </header>

        <div className="header">
          <div className="title">
            <h1>作品</h1>
            <span>
              {verified
                ? `${worldGroups.length} 个地图组 · ${worldList.length} 张地图`
                : `${worldGroups.length} 个作品`}
            </span>
          </div>
          <div className="headerActions">
            {adminEnabled ? (
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
                <button className="button" onClick={() => setLoginOpen(true)}>
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
          <div className="playerGrid">
            {playerGroups.map(({ groupId, main }) => (
              <article className="card" key={groupId}>
                {libraryEnabled ? (
                  <button
                    className="favoriteButton"
                    aria-label="收藏作品"
                    onClick={() => toggleFavorite(main.publicId)}
                  >
                    {favoriteIds.has(main.publicId) ? '★' : '☆'}
                  </button>
                ) : null}
                <Link
                  className="cardLink"
                  href={`/p/${encodeURIComponent(main.publicId)}`}
                  onClick={() => recordRecent(main.publicId)}
                >
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
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : worldList.length ? (
          <div className="groups">
            {worldGroups.map(({ groupId, main, submaps }) => (
              <section className="mapGroup" key={groupId} aria-label={`${main.name}地图组`}>
                <header className="groupHeader">
                  <div className="groupIdentity">
                    <span className="groupBadge">地图组</span>
                    <div>
                      <strong>{main.name}</strong>
                      <small>1 张主地图 · {submaps.length} 张副地图</small>
                    </div>
                  </div>
                  {verified ? (
                    <button
                      className="groupExport"
                      disabled={Boolean(busy)}
                      onClick={() => exportBundle(main)}
                    >
                      {busy === `export:${main.id}` ? '导出中…' : '导出地图组游玩包'}
                    </button>
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
                        </div>
                      </Link>
                      {verified ? (
                        <div className="cardActions">
                          <button disabled={Boolean(busy)} onClick={() => openWorldEditor(main)}>
                            编辑信息
                          </button>
                          <button
                            className="dangerText"
                            disabled={Boolean(busy)}
                            onClick={() => setDeleteWorld(main)}
                          >
                            删除主地图
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
                                </div>
                              </Link>
                              {verified ? (
                                <div className="cardActions">
                                  <button
                                    disabled={Boolean(busy)}
                                    onClick={() => openWorldEditor(world)}
                                  >
                                    编辑信息
                                  </button>
                                  <button
                                    className="dangerText"
                                    disabled={Boolean(busy)}
                                    onClick={() => setDeleteWorld(world)}
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
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>暂无作品</strong>
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
        <div className="backdrop" onMouseDown={() => setLoginOpen(false)}>
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

      {deleteWorld ? (
        <div className="backdrop" onMouseDown={() => setDeleteWorld(null)}>
          <div className="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h2>删除地图</h2>
            <p>确定删除“{deleteWorld.name}”吗？删除后玩家将无法进入该地图。</p>
            <div className="dialogActions">
              <button className="button" onClick={() => setDeleteWorld(null)}>
                取消
              </button>
              <button
                className="button danger"
                disabled={busy === `delete:${deleteWorld.id}`}
                onClick={confirmDelete}
              >
                {busy === `delete:${deleteWorld.id}` ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editWorld ? (
        <div
          className="backdrop"
          onMouseDown={() => {
            if (!busy) setEditWorld(null)
          }}
        >
          <form
            className="dialog editDialog"
            onSubmit={saveWorld}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>编辑地图信息</h2>
            <label htmlFor="play-world-name">作品名称</label>
            <input
              id="play-world-name"
              maxLength={40}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
            <label htmlFor="play-world-id">访问 ID</label>
            <input
              id="play-world-id"
              maxLength={63}
              spellCheck={false}
              value={editPublicId}
              onChange={(event) =>
                setEditPublicId(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
            />
            <small className="fieldHint">
              访问链接：/p/{editPublicId || '访问-id'} · 可以修改，当前游玩端中必须唯一
            </small>
            <label htmlFor="play-world-author">作者</label>
            <input
              id="play-world-author"
              maxLength={80}
              value={editAuthor}
              onChange={(event) => setEditAuthor(event.target.value)}
            />
            <label htmlFor="play-world-description">简介</label>
            <textarea
              id="play-world-description"
              maxLength={300}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
            />
            <label htmlFor="play-world-cover">封面</label>
            <input
              id="play-world-cover"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (file.size > 1400000) {
                  setNotice('封面图片不能超过 1.4MB')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => setEditCover(String(reader.result))
                reader.readAsDataURL(file)
              }}
            />
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
                disabled={Boolean(busy) || !editName.trim() || !editPublicId.trim()}
              >
                {busy === `edit:${editWorld.id}` ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {importProgress ? (
        <div className="progressBackdrop">
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
        .groupBadge {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 6px;
          color: #fff;
          background: #282c32;
          font-size: 11px;
          font-weight: 700;
        }
        .groupExport {
          height: 34px;
          padding: 0 12px;
          border: 1px solid #d9dadd;
          border-radius: 7px;
          color: #303238;
          background: #fff;
          font-size: 12px;
          cursor: pointer;
        }
        .groupExport:hover {
          background: #f3f4f5;
        }
        .groupExport:active {
          transform: scale(0.97);
        }
        .groupExport:disabled {
          cursor: default;
          opacity: 0.55;
          transform: none;
        }
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
          padding: 20px;
          background: rgba(20, 22, 25, 0.38);
        }
        .dialog {
          width: min(400px, 100%);
          padding: 22px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.2);
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
          border-radius: 7px;
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
          border-radius: 16px;
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
        /* Play management shares Creator and the launcher surface hierarchy:
           quiet charcoal surfaces, one yellow action colour, and only the
           borders needed to explain map-group relationships. */
        :global(body) {
          background: #262626;
          color: rgba(255, 255, 255, 0.9);
        }
        .page {
          padding-top: 36px;
          color: rgba(255, 255, 255, 0.9);
        }
        .title h1 {
          color: #fff;
          letter-spacing: -0.02em;
        }
        .title span {
          color: rgba(255, 255, 255, 0.45);
        }
        .button,
        .groupExport {
          border-color: rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.84);
          background: #404040;
        }
        .button:hover,
        .groupExport:hover {
          background: #4a4a4a;
        }
        .button.primary {
          border-color: #ffdb00;
          color: #262626;
          background: #ffdb00;
          font-weight: 700;
        }
        .button.primary:hover {
          background: #ffe44d;
        }
        .notice {
          border-color: rgba(246, 82, 82, 0.32);
          color: #ff9a9a;
          background: rgba(246, 82, 82, 0.08);
        }
        .mapGroup {
          border-color: rgba(255, 255, 255, 0.09);
          background: #333;
        }
        .groupHeader {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .groupIdentity small,
        .branchHeading small,
        .roleLabel {
          color: rgba(255, 255, 255, 0.44);
        }
        .groupBadge {
          color: #262626;
          background: #ffdb00;
        }
        .mainRole {
          color: #ffdb00;
        }
        .submapBranch,
        .submapBranch::before,
        .submapItem::before {
          border-color: rgba(255, 255, 255, 0.16);
        }
        .card,
        .submapItem .card {
          border-color: rgba(255, 255, 255, 0.08);
          background: #404040;
        }
        .mainMap .card {
          border-color: rgba(255, 219, 0, 0.35);
          box-shadow: none;
        }
        .card:hover {
          border-color: rgba(255, 219, 0, 0.58);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
        }
        .cover {
          color: rgba(255, 255, 255, 0.32);
          background: #333;
        }
        .info strong {
          color: #fff;
        }
        .info small {
          color: rgba(255, 255, 255, 0.45);
        }
        .info p {
          color: rgba(255, 255, 255, 0.58);
        }
        .cardActions {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .cardActions button {
          color: rgba(255, 255, 255, 0.68);
          background: #404040;
        }
        .cardActions button + button {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .cardActions button:hover {
          background: #4a4a4a;
        }
        .empty {
          border-color: rgba(255, 255, 255, 0.13);
          color: rgba(255, 255, 255, 0.45);
          background: #333;
        }
        .dialog {
          border: 1px solid rgba(255, 255, 255, 0.13);
          color: #fff;
          background: #262626;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.48);
        }
        .dialog h2 {
          color: #fff;
        }
        .dialog p,
        .dialog label {
          color: rgba(255, 255, 255, 0.62);
        }
        .dialog input,
        .dialog textarea {
          border-color: rgba(255, 255, 255, 0.18);
          color: #fff;
          background: #404040;
        }
        .dialog input:focus,
        .dialog textarea:focus {
          border-color: #ffdb00;
          box-shadow: 0 0 0 3px rgba(255, 219, 0, 0.14);
        }
        .fieldHint {
          color: rgba(255, 255, 255, 0.42);
        }
        .playWorkCenter .mapGroup,
        .playWorkCenter .card,
        .playWorkCenter .empty,
        .playWorkCenter .dialog,
        .playWorkCenter .progressDialog {
          border-radius: 8px;
        }
        .playWorkCenter .cover {
          border-radius: 8px 8px 0 0;
        }
        .collectionNav {
          display: flex;
          gap: 8px;
          margin: 0 0 18px;
        }
        .collectionNav button {
          height: 32px;
          padding: 0 11px;
          border: 0;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.55);
          background: #333;
          font-size: 12px;
          cursor: pointer;
        }
        .collectionNav button.active {
          color: #262626;
          background: #ffdb00;
        }
        .card {
          position: relative;
        }
        .favoriteButton {
          position: absolute;
          z-index: 3;
          top: 9px;
          right: 9px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          color: #ffdb00;
          background: rgba(38, 38, 38, 0.76);
          font-size: 18px;
          cursor: pointer;
        }
        .accountMenu {
          position: absolute;
          z-index: 8;
          top: 52px;
          right: 0;
          display: grid;
          gap: 5px;
          min-width: 185px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.62);
          background: #333;
          font-size: 12px;
        }
        .accountMenu strong {
          color: #fff;
        }
        .accountMenu small {
          color: rgba(255, 255, 255, 0.45);
        }
        /* Box-web visual language: quiet charcoal layers, dense navigation and
           rounded content surfaces. The page deliberately avoids dashboard-like
           empty panels and keeps yellow for a selected or primary action only. */
        :global(body) {
          background: #202124;
          color: #f5f5f5;
        }
        .playWorkCenter.page {
          width: min(1180px, calc(100% - 48px));
          padding: 0 0 88px;
        }
        .playWorkCenter .siteHeader {
          height: 64px;
          min-height: 64px;
          gap: 30px;
          margin: 0 0 30px;
          border-color: #383a3d;
        }
        .playWorkCenter .siteBrand {
          gap: 10px;
          color: #f5f5f5;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .playWorkCenter .siteMark {
          width: 21px;
          height: 21px;
          gap: 3px;
          transform: none;
        }
        .playWorkCenter .siteMark i {
          border-radius: 3px;
          background: #ffd400;
        }
        .playWorkCenter .siteMark i:nth-child(2) {
          background: #ffd400;
        }
        .playWorkCenter .siteMark i:nth-child(3) {
          background: #f5a524;
        }
        .playWorkCenter .siteNav {
          height: 64px;
          gap: 2px;
        }
        .playWorkCenter .siteNav a {
          height: 64px;
          padding: 0 8px;
          color: #9b9da1;
          font-size: 13px;
        }
        .playWorkCenter .siteNav .siteNavCurrent {
          color: #f5f5f5;
          box-shadow: inset 0 -2px #ffd400;
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
          border-radius: 8px;
          color: #e9eaec;
          background: transparent;
          cursor: pointer;
          transition:
            background-color 140ms ease,
            transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .siteAccount:hover {
          background: #2c2e31;
        }
        .playWorkCenter .siteAccount:active {
          transform: scale(0.97);
        }
        .playWorkCenter .accountAvatar {
          width: 26px;
          height: 26px;
          color: #1f2022;
          background: #ffd400;
        }
        .playWorkCenter .accountMenu {
          top: 42px;
          right: 0;
          min-width: 204px;
          padding: 14px;
          border-color: #45474b;
          border-radius: 10px;
          color: #aeb0b5;
          background: #2a2c2f;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
          transform-origin: top right;
          animation: account-menu-in 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .accountMenu strong {
          font-size: 13px;
        }
        .playWorkCenter .accountMenu small {
          color: #919399;
        }
        .playWorkCenter .header {
          margin-bottom: 18px;
        }
        .playWorkCenter .title {
          gap: 10px;
        }
        .playWorkCenter .title h1 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .playWorkCenter .title span {
          color: #898c91;
          font-size: 13px;
        }
        .playWorkCenter .button {
          height: 34px;
          border-color: #4a4c51;
          border-radius: 8px;
          color: #e8e9eb;
          background: #303236;
          font-size: 13px;
        }
        .playWorkCenter .button:hover {
          background: #3a3c40;
        }
        .playWorkCenter .button.primary {
          border-color: #ffd400;
          color: #1e1f20;
          background: #ffd400;
        }
        .playWorkCenter .collectionNav {
          gap: 6px;
          margin: 0 0 24px;
        }
        .playWorkCenter .collectionNav button {
          height: 30px;
          padding: 0 10px;
          border-radius: 7px;
          color: #a9abb0;
          background: transparent;
          transition:
            color 140ms ease,
            background-color 140ms ease;
        }
        .playWorkCenter .collectionNav button:hover {
          color: #f5f5f5;
          background: #303236;
        }
        .playWorkCenter .collectionNav button.active {
          color: #1e1f20;
          background: #ffd400;
        }
        .playWorkCenter .playerGrid {
          grid-template-columns: repeat(auto-fill, minmax(264px, 1fr));
          gap: 12px;
        }
        .playWorkCenter .card {
          border-color: #3b3d41;
          border-radius: 12px;
          background: #2a2c2f;
          box-shadow: none;
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .playWorkCenter .card:hover {
          border-color: #686b70;
          background: #2e3034;
          box-shadow: none;
          transform: translateY(-2px);
        }
        .playWorkCenter .cover {
          background: #34363a;
        }
        .playWorkCenter .info {
          padding: 13px 14px 15px;
        }
        .playWorkCenter .info strong {
          font-size: 15px;
        }
        .playWorkCenter .info small {
          margin-top: 5px;
          color: #919399;
        }
        .playWorkCenter .info p {
          color: #afb1b5;
          font-size: 13px;
        }
        .playWorkCenter .favoriteButton {
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          color: #ffd400;
          background: rgba(26, 27, 29, 0.78);
          font-size: 17px;
          transition:
            transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
            background-color 140ms ease;
        }
        .playWorkCenter .favoriteButton:hover {
          background: #1a1b1d;
        }
        .playWorkCenter .favoriteButton:active {
          transform: scale(0.94);
        }
        .playWorkCenter .empty {
          min-height: 152px;
          align-items: flex-start;
          gap: 5px;
          padding: 24px;
          border: 1px dashed #45474b;
          border-radius: 10px;
          color: #d9dade;
          background: transparent;
          text-align: left;
        }
        .playWorkCenter .empty strong {
          font-size: 15px;
        }
        .playWorkCenter .empty small {
          color: #909298;
          font-size: 13px;
        }
        .playWorkCenter .empty .button {
          margin-top: 12px;
        }
        @keyframes account-menu-in {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        /* Match the Creator header: the product mark and its text must remain
           readable above the dark application surface.  These explicit values
           also win over global game-page styles injected after navigation. */
        :global(body) {
          background: #262626;
        }
        .playWorkCenter .siteHeader {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .playWorkCenter .siteBrand {
          align-items: center !important;
          color: #fff !important;
          display: inline-flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          white-space: nowrap !important;
        }
        .playWorkCenter .siteBrand .siteMark {
          display: grid !important;
          flex: 0 0 auto !important;
        }
        .playWorkCenter .siteBrandName {
          display: block !important;
          flex: 0 0 auto !important;
          line-height: 1 !important;
        }
        .playWorkCenter .siteNav a {
          color: rgba(255, 255, 255, 0.62) !important;
        }
        .playWorkCenter .siteNav .siteNavCurrent {
          color: #fff !important;
        }
        .playWorkCenter .siteAccount {
          color: rgba(255, 255, 255, 0.88) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .card,
          .groupExport {
            transition: none;
          }
        }
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
          .playerGrid {
            grid-template-columns: 1fr;
          }
          .mapGroup {
            padding: 14px;
          }
          .groupHeader {
            align-items: flex-start;
            flex-direction: column;
          }
          .groupExport {
            width: 100%;
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

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return { redirect: { destination: '/players', permanent: false } }
  }
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play') {
    return { redirect: { destination: '/projects', permanent: false } }
  }
  // Only used by the local UI development server. Production play deployments
  // never set this flag, so their player authentication flow is unchanged.
  if (process.env.NODE_ENV === 'development' && process.env.BOX_UI_PREVIEW === 'true') {
    return {
      props: {
        worlds: getPlayWorlds(),
        adminEnabled: isPlayAdminEnabled(),
      },
    }
  }
  const { hasAuthenticatedPlayer, playerLoginURL } = await import('../server/player-service-client')
  if (
    !(await hasAuthenticatedPlayer(
      req.headers.cookie || '',
      req.socket.remoteAddress || '',
      String(req.headers['user-agent'] || ''),
    ))
  ) {
    return { redirect: { destination: playerLoginURL('play'), permanent: false } }
  }
  if (!process.env.BOX_PLAY_LIBRARY_PATH) {
    return {
      redirect: {
        destination: `/p/${encodeURIComponent(process.env.BOX_WORLD_PUBLIC_ID || process.env.BOX_WORLD_ID || 'local')}`,
        permanent: false,
      },
    }
  }
  return {
    props: {
      worlds: getPlayWorlds(),
      adminEnabled: isPlayAdminEnabled(),
    },
  }
}
