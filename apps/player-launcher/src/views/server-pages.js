import { playerSkinOptions } from '../services/player-skins.js'

function renderPlayerAccountControl(state, { icon, escapeHtml }) {
  if (!state.player) return ''
  const displayName = state.player.displayName || state.player.username || '已登录用户'
  const username = state.player.username || ''
  const skin = playerSkinOptions.find((item) => item.id === state.player.avatarSkinId)
    || playerSkinOptions[0]

  return `
    <div class="player-account-control">
      <button class="player-account-trigger" type="button" data-action="toggle-player-menu" aria-haspopup="menu" aria-expanded="${state.playerMenuOpen}">
        <img src="${skin.preview}" alt="" class="player-account-avatar">
        <span class="player-account-copy"><strong>${escapeHtml(displayName)}</strong><small>${escapeHtml(username)}</small></span>
        ${icon('chevron')}
      </button>
      ${state.playerMenuOpen ? `<div class="player-account-menu" role="menu">
        <div class="player-account-menu-identity"><strong>${escapeHtml(displayName)}</strong><small>${escapeHtml(username)}</small></div>
        <button type="button" role="menuitem" data-action="open-player-settings">账号设置</button>
        <button type="button" role="menuitem" data-action="logout">退出登录</button>
      </div>` : ''}
    </div>`
}

function renderPlayerSettings(state, { icon, escapeHtml }) {
  if (!state.playerSettingsOpen || !state.player) return ''
  const username = state.player.username || ''
  return `
    <div class="player-profile-backdrop" data-player-profile-backdrop>
      <section class="player-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="player-profile-title">
        <header class="player-profile-heading">
          <div>
            <h2 id="player-profile-title">账号设置</h2>
            <p>昵称和角色皮肤仅在此服务器下生效。</p>
          </div>
          <button type="button" class="player-profile-close" data-close-player-settings aria-label="关闭">${icon('close')}</button>
        </header>
        <form id="player-profile-form">
          <div class="player-profile-content">
            <label class="player-profile-field">
              <span>玩家账号</span>
              <input value="${escapeHtml(username)}" disabled readonly>
              <small>账号由服务器管理，不可修改。</small>
            </label>
            <label class="player-profile-field" for="player-profile-name">
              <span>显示昵称</span>
              <input id="player-profile-name" name="displayName" value="${escapeHtml(state.playerProfileName || state.player.displayName || username)}" maxlength="32" required ${state.busy ? 'disabled' : ''}>
            </label>
            <fieldset class="player-profile-skin-field">
              <legend>角色皮肤</legend>
              <div class="player-profile-skins">
                ${playerSkinOptions.map((skin) => `<button class="player-profile-skin ${state.playerProfileSkinId === skin.id ? 'selected' : ''}" type="button" data-player-skin="${skin.id}" aria-pressed="${state.playerProfileSkinId === skin.id}" ${state.busy ? 'disabled' : ''}>
                  <img src="${skin.preview}" alt="">
                  <span>${skin.name}</span>
                </button>`).join('')}
              </div>
            </fieldset>
            ${state.playerProfileError ? `<p class="player-profile-error" role="alert">${escapeHtml(state.playerProfileError)}</p>` : ''}
          </div>
          <footer class="player-profile-actions">
            <button class="button secondary" type="button" data-close-player-settings ${state.busy ? 'disabled' : ''}>取消</button>
            <button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? '正在保存…' : '保存设置'}</button>
          </footer>
        </form>
      </section>
    </div>`
}

function renderWorldCard(world, state, server, { icon, escapeHtml }) {
  const packageKey = `${server.id}:${world.id}`
  const progress = state.packageStates?.[packageKey]
  const preparing = state.preparingMapId === world.id
  const action = preparing || !progress?.ready ? 'prepare-map' : 'launch-map'
  const label = preparing
    ? `正在准备 ${state.prepareProgress?.done || 0}/${state.prepareProgress?.total || 0}`
    : progress?.ready ? '开始游玩' : '准备地图并游玩'
  const image = world.cover
    ? `<img class="world-cover" src="${escapeHtml(world.cover)}" alt="" loading="lazy">`
    : `<div class="world-cover-placeholder">${icon('packages')}</div>`
  const installProgress = preparing && state.prepareProgress?.totalBytes
    ? `<div class="install-progress"><progress max="${state.prepareProgress.totalBytes}" value="${state.prepareProgress.receivedBytes || 0}"></progress><small>${(state.prepareProgress.receivedBytes / 1024 / 1024).toFixed(1)} / ${(state.prepareProgress.totalBytes / 1024 / 1024).toFixed(1)} MB</small></div>`
    : ''

  return `<article class="world-card surface">
    ${image}
    <div class="world-copy">
      <h3>${escapeHtml(world.name || '未命名地图')}</h3>
      <p>${escapeHtml(world.description || '由服务器提供的可游玩地图。')}</p>
      ${world.author ? `<small>作者：${escapeHtml(world.author)}</small>` : ''}
      ${progress?.ready ? '<small class="prepared-hint">本地资源已验证，开始后仍由服务器负责联机与实时数据。</small>' : ''}
      ${installProgress}
      <button class="button ${preparing ? 'secondary' : 'primary'}" type="button" data-action="${action}" data-map-id="${escapeHtml(world.id)}" ${state.busy || preparing ? 'disabled' : ''}>${label}</button>
    </div>
  </article>`
}

export function renderServerPage(state, server, { icon, escapeHtml }) {
  if (state.page === 'home') {
    const hasServers = state.servers.length > 0
    return `
      <section class="page welcome-page">
        <h1>准备好开始游玩了吗？</h1>
        <p>${hasServers ? '你已添加服务器，从左侧选择一个服务器开始游玩。' : '添加一个私服地址。启动器会为你找到可玩的地图，并在进入前自动准备好所需资源。'}</p>
        ${hasServers ? '' : `<button class="button primary" data-nav="add-server">${icon('plus')}添加服务器</button>`}
      </section>`
  }

  if (state.page === 'add-server') return `
    <section class="page narrow">
      <div class="page-heading"><h1>添加服务器</h1><p>输入服主提供的游玩地址。添加后，启动器会显示该服务器开放的地图。</p></div>
      <form id="server-form" class="surface add-form">
        <label for="server-endpoint">服务器地址</label>
        <div class="input-row"><span class="input-icon">${icon('globe')}</span><input id="server-endpoint" name="endpoint" value="${escapeHtml(state.endpointInput)}" placeholder="请输入游玩端服务器 IP 或域名" autocomplete="url" required autofocus ${state.busy ? 'disabled' : ''} /></div>
        <p class="field-help">支持域名、IP 和端口；域名默认 HTTPS，本机地址默认 HTTP。</p>
        <div class="form-actions"><button type="button" class="button secondary" data-nav="home">取消</button><button class="button primary" ${state.busy ? 'disabled' : ''}>${state.busy ? '正在检查服务器…' : '添加服务器'}${icon('arrow')}</button></div>
      </form>
    </section>`

  if (!server) return `
    <section class="page welcome-page">
      <h1>准备好开始游玩了吗？</h1>
      <p>从左侧选择一个服务器，或添加新的服务器开始游玩。</p>
    </section>`

  const editingName = state.editingServerId === server.id
  const bootstrap = state.serverBootstrap
  const mapStatus = bootstrap?.loading
    ? ['正在检查服务器…', '正在读取服务器的玩家启动器开放状态。']
    : bootstrap?.error
      ? ['无法读取服务器状态', bootstrap.error]
      : !bootstrap?.supported
        ? ['服务器暂不支持玩家启动器', '请服主升级 Play 服务后，再从启动器导入地图。']
        : !bootstrap.resourceAccessEnabled
          ? ['服务器未开放玩家启动器', '请联系服主在后台开启玩家启动器资源访问。']
          : ['玩家启动器已开放', '']
  const loginRequired = bootstrap?.supported && bootstrap.resourceAccessEnabled && bootstrap.loginRequired
  const needsLogin = loginRequired && !state.player
  const mapContent = bootstrap?.loading || bootstrap?.error || !bootstrap?.supported || !bootstrap?.resourceAccessEnabled
    ? `<div class="empty-maps surface"><div class="empty-map-icon">${icon('packages')}</div><h3>${escapeHtml(mapStatus[0])}</h3><p>${escapeHtml(mapStatus[1])}</p></div>`
    : needsLogin
      ? `<div class="login-layout">
          <section class="surface login-card" aria-labelledby="player-login-title">
            <div class="login-card-heading">
              <h3 id="player-login-title">登录后查看地图</h3>
              <p>账号仅在此服务器下有效，密码不会保存在本机。</p>
            </div>
            ${state.authError ? `<p class="inline-error" role="alert">${escapeHtml(state.authError)}</p>` : ''}
            <form id="player-login-form">
              <div class="login-field">
                <label for="player-username">玩家账号</label>
                <input id="player-username" name="username" autocomplete="username" placeholder="输入此服务器的玩家账号" autocapitalize="none" spellcheck="false" required ${state.busy ? 'disabled' : ''}>
              </div>
              <div class="login-field">
                <label for="player-password">密码</label>
                <input id="player-password" name="password" type="password" autocomplete="current-password" placeholder="输入密码" required ${state.busy ? 'disabled' : ''}>
              </div>
              <button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? '正在登录…' : '登录并查看地图'}${icon('arrow')}</button>
            </form>
          </section>
        </div>`
      : state.mapsError
        ? `<div class="empty-maps surface"><div class="empty-map-icon">${icon('packages')}</div><h3>暂时无法读取地图</h3><p>${escapeHtml(state.mapsError)}</p></div>`
        : state.worlds.length
          ? `<div class="world-grid">${state.worlds.map((world) => renderWorldCard(world, state, server, { icon, escapeHtml })).join('')}</div>`
          : `<div class="empty-maps surface"><div class="empty-map-icon">${icon('packages')}</div><h3>暂无可游玩的地图</h3><p>该服务器目前没有向你开放的地图。</p></div>`

  return `
    <section class="page ${needsLogin ? 'login-required-page' : ''}">
      <div class="page-heading server-heading">
        <div class="server-heading-top">
          <div class="server-heading-copy">
            ${editingName ? `
              <form id="server-name-form" class="server-name-edit">
                <input id="server-name-input" name="name" value="${escapeHtml(state.serverNameInput)}" maxlength="40" aria-label="服务器昵称" required autofocus ${state.busy ? 'disabled' : ''} />
                <button class="title-icon-button save-name" type="submit" title="保存昵称" aria-label="保存昵称" ${state.busy ? 'disabled' : ''}>${icon('check')}</button>
                <button class="title-icon-button" type="button" data-action="cancel-server-name" title="取消编辑" aria-label="取消编辑">${icon('close')}</button>
              </form>` : `
              <div class="server-title-row">
                <h1>${escapeHtml(server.name || server.endpoint)}</h1>
                <button class="title-icon-button" type="button" data-action="edit-server-name" title="编辑服务器昵称" aria-label="编辑服务器昵称">${icon('edit')}</button>
              </div>`}
            <p>${escapeHtml(server.endpoint)}</p>
          </div>
          ${renderPlayerAccountControl(state, { icon, escapeHtml })}
        </div>
      </div>
      ${needsLogin ? '' : `<div class="section-heading"><h2>可游玩的地图</h2><button class="button secondary" data-action="discover" ${state.busy ? 'disabled' : ''}>重新检查</button></div>`}
      ${mapContent}
      ${renderPlayerSettings(state, { icon, escapeHtml })}
    </section>`
}

export function renderPackagesPage(icon) {
  return `
    <section class="page">
      <div class="page-heading"><span class="eyebrow">本机资源</span><h1>已准备的地图资源</h1><p>地图资源只从已添加且已授权的服务器获取，并在开始游玩前自动校验。</p></div>
      <div class="surface import-card">
        <div class="import-icon">${icon('packages')}</div>
        <div class="import-copy"><h2>通过服务器准备地图</h2><p>选择左侧服务器，登录玩家账号后即可下载、校验并进入地图。</p></div>
        <button class="button primary" data-nav="servers">选择服务器</button>
      </div>
      <div class="empty-maps surface compact"><div class="empty-map-icon">${icon('packages')}</div><p>地图资源会在从服务器准备时自动下载并校验。</p></div>
    </section>`
}
