import type { PlayerLauncherState } from '../../types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024,
    index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(1)} ${units[index]}`
}

export function renderStoragePage(
  state: PlayerLauncherState,
  escapeHtml: (value: unknown) => string,
): string {
  const storage = state.storage
  const rows = (storage?.rows || []).filter((row) => row.maps?.length || row.httpBytes > 0)
  const selected = rows.find((row) => row.serverId === storage?.selectedServerId)
  const server = state.servers.find((item) => item.id === selected?.serverId)
  const feedback = storage?.error
    ? `<p class="inline-error" role="alert">${escapeHtml(storage.error)}</p>`
    : ''
  const loading = storage?.loading ? '<p role="status">正在读取本机缓存…</p>' : ''
  if (!selected || !server)
    return `<section class="page">
    <div class="page-heading"><h1>本机存储</h1><p>选择一个服务器，查看或清理各地图的本机缓存。这里只显示有缓存的服务器。</p></div>
    ${feedback}${loading}
    <div class="storage-list">${
      rows
        .map((usage) => {
          const item = state.servers.find((candidate) => candidate.id === usage.serverId)
          if (!item) return ''
          const bytes = usage.maps.reduce((sum, map) => sum + map.bytes, 0)
          return `<button class="surface storage-row storage-server-trigger" data-open-storage-server="${escapeHtml(item.id)}">
        <div><h3>${escapeHtml(item.name || item.endpoint)}</h3><p>${escapeHtml(item.endpoint)}</p>
        <small>${usage.maps.length} 张缓存地图 · 地图资源 ${formatBytes(bytes)}${usage.httpBytes ? ` · 浏览器缓存 ${formatBytes(usage.httpBytes)}` : ''}</small></div>
        <span aria-hidden="true">›</span>
      </button>`
        })
        .join('') ||
      (!storage?.loading
        ? '<div class="empty-maps surface"><h3>暂无本机缓存</h3><p>游玩地图后，有缓存的服务器会显示在这里。</p></div>'
        : '')
    }</div>
  </section>`
  const confirmingAll = storage?.confirmServerId === server.id
  return `<section class="page">
    <button class="button secondary storage-back" data-storage-back>‹ 返回服务器列表</button>
    <div class="page-heading"><h1>${escapeHtml(server.name || server.endpoint)}</h1><p>${escapeHtml(server.endpoint)}</p></div>
    ${feedback}${loading}
    <div class="section-heading"><h2>已缓存的地图</h2>
      ${confirmingAll ? `<div class="storage-confirm"><span>清理此服务器的全部缓存？</span><button class="button" data-cancel-cache>取消</button><button class="button danger" data-confirm-cache="${escapeHtml(server.id)}" ${state.busy ? 'disabled' : ''}>确认清理</button></div>` : `<button class="button secondary" data-clear-cache="${escapeHtml(server.id)}" ${selected.inUse || state.busy ? 'disabled' : ''}>清理全部缓存</button>`}
    </div>
    ${selected.inUse ? '<p class="field-help">游戏正在运行，关闭游戏窗口后即可清理缓存。</p>' : ''}
    <div class="storage-list">${selected.maps
      .map(
        (map) => `<article class="surface storage-row" data-map-cache="${escapeHtml(map.mapId)}">
      <div><h3>${escapeHtml(map.name)}</h3><small>${map.resources} 项资源 · ${formatBytes(map.bytes)}</small></div>
      ${storage?.confirmMapId === map.mapId ? `<div class="storage-confirm"><span>清理这张地图的缓存？</span><button class="button" data-cancel-cache>取消</button><button class="button danger" data-confirm-map-cache="${escapeHtml(map.mapId)}" ${state.busy ? 'disabled' : ''}>确认清理</button></div>` : `<button class="button secondary" data-clear-map-cache="${escapeHtml(map.mapId)}" ${selected.inUse || state.busy ? 'disabled' : ''}>清理地图缓存</button>`}
    </article>`,
      )
      .join('')}</div>
    ${selected.httpBytes > 0 ? `<div class="surface storage-row storage-browser-cache"><div><h3>浏览器缓存 · ${formatBytes(selected.httpBytes)}</h3><p>页面、字体等共享内容不按地图拆分，可通过“清理全部缓存”移除。</p></div></div>` : ''}
  </section>`
}
