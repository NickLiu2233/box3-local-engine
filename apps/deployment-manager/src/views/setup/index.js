import { escapeHtml } from '../../ui/html.js'
import { hostFromAddress } from '../../configuration/addresses.js'
import { icon } from '../../ui/icons.js'
import { input, settingToggle, setupExplanation } from '../../ui/forms.js'
import { isWebManager } from '../../infrastructure/transport.js'
import { progressPanel } from '../../ui/shell.js'
import { state } from '../../core/state.js'

export function setup() {
  const config = state.config || {}
  const databaseMode = config.databaseMode || 'managed'
  const redisMode = config.redisMode || 'disabled'
  const creatorHost = config.creatorHost || '127.0.0.1'
  const legacyCreatorPublicHost =
    creatorHost === '127.0.0.1' ||
    creatorHost === 'localhost' ||
    (config.lanIp && creatorHost === config.lanIp)
      ? ''
      : creatorHost
  const inferredAccessMode =
    config.playNetworkMode ||
    config.creatorNetworkMode ||
    (config.publicHost === '127.0.0.1' || config.publicHost === 'localhost'
      ? 'local'
      : config.lanIp && config.publicHost === config.lanIp
        ? 'lan'
        : 'public')
  const accessMode = state.accessMode || inferredAccessMode
  const storedPublicAddress = config.publicAddress || (config.publicHost
    ? config.publicHost.includes('://')
      ? config.publicHost
      : config.publicHost.includes('.') && !/^\d+(?:\.\d+){3}$/.test(config.publicHost)
        ? `http://${config.publicHost}`
        : config.publicHost
    : legacyCreatorPublicHost)
  const publicAddressHost = hostFromAddress(storedPublicAddress)
  const publicAddressValue = ['127.0.0.1', 'localhost', config.lanIp].includes(publicAddressHost)
    ? ''
    : storedPublicAddress
  const endpointAddressInput = (name, label) =>
    accessMode === 'public'
      ? input(
          name,
          `${label} 公网地址`,
          config[name] || '',
          'text',
          '',
          false,
          { hideHint: true },
        )
      : `<input name="${name}" type="hidden" value="${escapeHtml(config[name] || '')}"/>`
  const tab = (id, label) =>
    `<button type="button" class="setup-tab ${state.setupSection === id ? 'active' : ''}" data-setup-section="${id}">${label}</button>`
  const secretCard = (name, label, configured) => {
    const editing = Boolean(state.ownerSecretEditing[name])
    const secret = config[name] || state.ownerSecrets?.[name] || ''
    const displayValue = configured || secret ? '•'.repeat(16) : '保存配置后自动生成'
    const copied = state.ownerSecretCopied === name
    return `<article class="secret-row ${editing ? 'editing' : ''}">
      <div class="secret-meta"><strong>${label}</strong></div>
      <div class="secret-control">
        ${
          editing
            ? `<input class="secret-editor" name="${name}" type="text" value="${escapeHtml(secret)}" autocomplete="new-password" spellcheck="false" aria-label="编辑${label}"/>`
            : `<code class="secret-value ${secret || configured ? '' : 'empty'}">${displayValue}</code>`
        }
      </div>
      <div class="secret-actions">
        ${
          editing
            ? `<button type="submit" class="secret-action primary" data-secret-save="${name}" title="保存密钥">${icon('check')}<span>保存</span></button>
               <button type="button" class="secret-action" data-secret-edit="${name}" aria-pressed="true" title="取消编辑">${icon('edit')}<span>取消</span></button>`
            : `<button type="button" class="secret-action" data-secret-edit="${name}" aria-pressed="false" title="编辑密钥">${icon('edit')}<span>编辑</span></button>`
        }
        <button type="button" class="secret-action ${copied ? 'copied' : ''}" data-secret-copy="${name}" title="复制密钥">${icon(copied ? 'check' : 'copy')}<span>${copied ? '已复制' : '复制'}</span></button>
      </div>
    </article>`
  }
  const rawEnvironmentPanel = `<section class="setup-panel environment-panel ${state.setupSection === 'environment' ? 'active' : ''}" data-setup-panel="environment"><div class="config-group raw-config-group"><div class="group-title"><div><h2>原始 .env</h2><span>含有敏感数据，请勿截图或转发</span></div><button type="button" class="text-button" id="reload-raw-environment" ${state.environmentFileSaving ? 'disabled' : ''}>重新读取</button></div><textarea id="raw-environment" class="raw-environment" spellcheck="false" ${state.environmentFileSaving ? 'disabled' : ''}>${escapeHtml(state.environmentFile)}</textarea></div>${setupExplanation(
    '配置说明：什么时候需要编辑原始 .env？',
    [
      ['适合场景', '需要调整模板中没有展示的高级参数，或排查服主部署问题时使用。'],
      ['保存生效', '保存只写入文件，不会自动重启；请回到总览重新启动受影响的服务。'],
      ['安全提醒', '这里会显示数据库密码和密钥，不要截图、提交到仓库或发送给其他人。'],
    ],
  )}</section>`
  const storagePath = state.dataStorage?.path || ''
  const dataStoragePanel = `<section class="setup-panel storage-panel ${state.setupSection === 'storage' ? 'active' : ''}" data-setup-panel="storage">
      <section class="config-group data-storage-group" aria-label="数据存储位置">
        <div class="group-title"><div><h2>${isWebManager() ? 'Linux 数据目录' : '数据目录'}</h2></div><button type="button" class="text-button" id="choose-data-storage" ${state.busy || !state.dataStorage ? 'disabled' : ''}>${isWebManager() ? '迁移到此目录' : '更改位置'}</button></div>
        ${isWebManager() ? `<input id="linux-data-directory" class="storage-path" type="text" value="${escapeHtml(storagePath)}" placeholder="/data/BoxEngineData" spellcheck="false"/>` : `<code class="storage-path">${escapeHtml(storagePath || '正在读取…')}</code>`}
      </section>
      ${setupExplanation('配置说明：数据目录如何迁移？', [
        ['迁移内容', '地图、模型、构建产物和备份会一并迁移。'],
        ['开始前', '请先停止全部服务；迁移完成后从服务总览重新启动。'],
        [
          '目录格式',
          isWebManager()
            ? '填写 Linux 服务器绝对路径，例如 /data/BoxEngineData。'
            : '请选择目标磁盘中的一个目录。',
        ],
      ])}
    </section>`
  return `<header><div><h1>数据配置</h1></div></header>
    ${state.busy ? progressPanel() : ''}
    <form id="setup-form" novalidate class="${state.setupSection === 'environment' ? 'environment-mode' : ''}">
      <div class="setup-tabs">${tab('data', '数据服务')}${tab('storage', '数据存储')}${tab('network', '访问设置')}${tab('capacity', '运行容量')}${tab('backup', '地图备份')}${tab('security', '服主与安全')}${tab('environment', '原始 .env')}</div>
      <div class="setup-panels">
        <section class="setup-panel ${state.setupSection === 'data' ? 'active' : ''}" data-setup-panel="data">
          <div class="config-group"><div class="group-title"><div><h2>PostgreSQL</h2></div>${databaseMode === 'external' ? '<button type="button" class="text-button" data-test-connection="postgresql">测试连接</button>' : ''}</div><input name="databaseMode" type="hidden" value="${databaseMode}"/><div class="database-mode-choice"><button type="button" class="${databaseMode === 'managed' ? 'active' : ''}" data-database-mode="managed"><strong>内置数据库</strong><span>启动器自动配置和维护</span></button><button type="button" class="${databaseMode === 'external' ? 'active' : ''}" data-database-mode="external"><strong>外部数据库</strong><span>连接已有的 PostgreSQL</span></button></div>${databaseMode === 'managed' ? managedServicePanel('postgresql', state.managedDatabaseInfo) : `<div class="form-grid compact three">${input('databaseHost', '地址', config.databaseHost === 'managed-postgres' ? '' : config.databaseHost, 'text', 'IP 或域名', true)}${input('databasePort', '端口', config.databasePort || '5432', 'number', '', true, { min: 1, max: 65535 })}${input('databaseName', '数据库', config.databaseName || 'box', 'text', '', true)}${input('databaseUser', '账号', config.databaseUser || 'box', 'text', '', true)}${input('databasePassword', '密码', '', 'password', config.databasePassword ? '本次配置已输入，保存时会使用' : config.hasDatabasePassword ? '留空保留原密码' : '首次保存时必填')}${input('databasePoolSize', '每运行时连接池', config.databasePoolSize ?? 10, 'number', '1–100', false, { min: 1, max: 100 })}<label class="check-field"><input name="databaseSsl" type="checkbox" ${config.databaseSsl ? 'checked' : ''}/><span>使用 SSL</span></label></div>`}</div>
          <div class="config-group"><div class="group-title"><div><h2>Redis</h2></div>${redisMode === 'external' ? '<button type="button" class="text-button" data-test-connection="redis">测试连接</button>' : ''}</div><input name="redisMode" type="hidden" value="${redisMode}"/><div class="database-mode-choice redis-mode-choice"><button type="button" class="${redisMode === 'disabled' ? 'active' : ''}" data-redis-mode="disabled"><strong>不启用</strong><span>保持最少依赖</span></button><button type="button" class="${redisMode === 'managed' ? 'active' : ''}" data-redis-mode="managed"><strong>内置 Redis</strong><span>启动器自动维护</span></button><button type="button" class="${redisMode === 'external' ? 'active' : ''}" data-redis-mode="external"><strong>外部 Redis</strong><span>连接已有服务</span></button></div>${redisMode === 'managed' ? managedServicePanel('redis', state.managedRedisInfo) : redisMode === 'external' ? `<div class="form-grid compact three">${input('redisHost', '地址', config.redisHost === 'managed-redis' ? '' : config.redisHost, 'text', 'IP 或域名', true)}${input('redisPort', '端口', config.redisPort || '6379', 'number', '', true, { min: 1, max: 65535 })}${input('redisPassword', '密码', '', 'password', config.redisPassword ? '本次配置已输入，保存时会使用' : config.hasRedisPassword ? '留空保留原密码' : '外部 Redis 无密码时可留空')}${input('redisDb', '业务 DB', config.redisDb ?? 0, 'number', '0–255', false, { min: 0, max: 255 })}${input('storageCacheRedisDb', '缓存 DB', config.storageCacheRedisDb ?? 1, 'number', '0–255', false, { min: 0, max: 255 })}${input('storageCacheRedisTtl', '构建缓存时间（秒）', config.storageCacheRedisTtl ?? 240, 'number', '0 表示关闭，最大 255', false, { min: 0, max: 255 })}</div>` : ''}</div>
          ${setupExplanation('配置说明：这些服务用来做什么？', [
            [
              'PostgreSQL',
              '用于保存玩家账号、权限和地图脚本等长期数据。桌面启动器可自动管理内置数据库，也可连接外部 PostgreSQL。',
            ],
            [
              'Redis',
              '用于缓存和运行时协调，可选择不启用、由启动器管理内置 Redis，或连接外部 Redis。它不是主要数据来源。',
            ],
            [
              '业务 DB / 缓存 DB',
              'Redis 中的两个逻辑空间。保持不同编号，避免业务数据和缓存互相影响。',
            ],
            ['连接池', '每个地图运行时可使用的 PostgreSQL 连接数；地图并发较多时不要盲目调高。'],
            ['构建缓存', 'Redis 中预烘焙构建结果的缓存秒数；设为 0 可关闭，推荐保持 240。'],
            [
              'SSL',
              '只有远程 PostgreSQL 要求加密连接时才勾选；不确定时按数据库服务商提供的连接要求填写。',
            ],
          ])}
        </section>
        ${dataStoragePanel}
        <section class="setup-panel ${state.setupSection === 'backup' ? 'active' : ''}" data-setup-panel="backup">
          <div class="config-group">
            <div class="group-title">
              <div><h2>自动备份</h2></div>
              <label class="backup-switch"><input name="autoBackupEnabled" type="checkbox" ${config.autoBackupEnabled ? 'checked' : ''}/><span aria-hidden="true"></span><strong>启用</strong></label>
            </div>
            <div class="form-grid compact three">${input('autoBackupIntervalMinutes', '备份间隔（分钟）', config.autoBackupIntervalMinutes || 60, 'number', '1–10080')}${input('autoBackupRetentionCount', '每张地图保留份数', config.autoBackupRetentionCount || 24, 'number', '1–1000')}${input('autoBackupRetentionDays', '最长保留天数', config.autoBackupRetentionDays || 30, 'number', '1–3650')}</div>
          </div>
          ${setupExplanation('配置说明：自动备份会保存什么？', [
            [
              '备份范围',
              '按计划导出每个地图组工程，包含地图、资源库与地图配置；不包含 PostgreSQL、Redis 或用户账号数据。',
            ],
            [
              '保留规则',
              '每地图保留份数与最长保留天数同时生效，达到任一限制时，最早的自动备份会被清理。',
            ],
            [
              '关闭后的影响',
              '关闭后停止创建新的自动备份，不会删除已有备份；已有文件可在左侧“数据与备份”中导出、恢复或删除。',
            ],
            ['立即备份', '需要在重要修改前手动保存时，请前往“数据与备份”使用右上角的“立即备份”。'],
          ])}
        </section>
        <section class="setup-panel ${state.setupSection === 'network' ? 'active' : ''}" data-setup-panel="network">
          <div class="network-layout">
            <section class="network-service-card network-access-card">
              <div class="network-card-heading"><h2>访问范围</h2></div>
              <input name="playNetworkMode" type="hidden" value="${accessMode}"/>
              <input name="creatorNetworkMode" type="hidden" value="${accessMode}"/>
              <div class="access-choice"><button type="button" class="${accessMode === 'local' ? 'active' : ''}" data-network-mode="local">本机</button><button type="button" class="${accessMode === 'lan' ? 'active' : ''}" data-network-mode="lan" ${config.lanIp ? '' : 'disabled'}>局域网</button><button type="button" class="${accessMode === 'public' ? 'active' : ''}" data-network-mode="public">公网</button></div>
              ${accessMode === 'public' ? `<div class="network-access-address">${input('publicAddress', '共用公网地址（IP 或域名）', publicAddressValue, 'text', '域名需带 http:// 或 https://；IP 可直接填写', true)}<input name="creatorHost" type="hidden" value="${escapeHtml(config.publicHost || '')}"/></div>` : `<input name="publicAddress" type="hidden" value="${escapeHtml(config.publicAddress || '')}"/><input name="creatorHost" type="hidden" value="${escapeHtml(config.publicHost || '')}"/>`}
            </section>
            <div class="network-primary-grid">
              <section class="network-service-card"><div class="network-card-heading"><h2>游玩端</h2></div><div class="form-grid single">${input('playPort', 'Play 端口', config.playPort || 3121, 'number')}${endpointAddressInput('playPublicAddressOverride', 'Play')}</div></section>
              <section class="network-service-card"><div class="network-card-heading"><h2>创作端</h2></div><div class="form-grid card-port-grid">${input('creatorPort', 'ARENA 端口', config.creatorPort || 3127, 'number')}${input('voxaPort', 'VOXA 端口', config.voxaPort || 3123, 'number')}${endpointAddressInput('creatorPublicAddressOverride', 'ARENA')}${endpointAddressInput('voxaPublicAddressOverride', 'VOXA')}</div></section>
            </div>
            <section class="network-service-card player-service-card"><div class="network-card-heading"><h2>账号服务</h2><span>留空时沿用共用地址</span></div><div class="form-grid player-port-grid">${input('playerServicePort', '后台管理端口', config.playerServicePort || 3124, 'number')}${input('authPortalPort', '登录页面端口', config.authPortalPort || 3125, 'number')}${endpointAddressInput('playerServicePublicAddressOverride', '后台管理')}${endpointAddressInput('authPortalPublicAddressOverride', '登录页面')}</div></section>
          </div>${setupExplanation('配置说明：访问地址和端口有什么影响？', [
            [
              '统一访问范围',
              'Play、ARENA、VOXA、账号服务和登录页面统一使用本机、局域网或公网模式，避免监听地址互相冲突。',
            ],
            ['公网地址优先级', '先填写共用公网地址；某个服务填写了自己的公网地址后，就优先使用该地址。留空的服务继续使用共用地址。'],
            ['公网地址', 'IP 可只填写地址；域名必须显式填写 http:// 或 https://。单端地址可带自己的端口，例如 https://play.example.com 或 http://play.example.com:3121。'],
            ['端口', '每个服务使用独立端口，不能重复；修改后访问链接也会随之改变。'],
          ])}</section>
        <section class="setup-panel ${state.setupSection === 'capacity' ? 'active' : ''}" data-setup-panel="capacity">
          <div class="config-group"><div class="group-title"><div><h2>实例容量</h2></div></div><div class="form-grid">${input('playRuntimes', '游玩运行时', config.playRuntimes || 8, 'number', '至少 1', false, { min: 1 })}${input('playerLimit', '单实例玩家上限', config.playerLimit || 70, 'number', '1–1000', false, { min: 1, max: 1000 })}${input('creatorEditRuntimes', '编辑运行时', config.creatorEditRuntimes || 6, 'number', '至少 1', false, { min: 1 })}${input('creatorPlayRuntimes', '创作预览', config.creatorPlayRuntimes || 4, 'number', '至少 1', false, { min: 1 })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>预热策略</h2></div></div><div class="form-grid">${input('playPrewarmRuntimes', 'Play 预热', config.playPrewarmRuntimes ?? 0, 'number', '0 表示按需启动', false, { min: 0 })}${input('creatorEditPrewarmRuntimes', '编辑预热', config.creatorEditPrewarmRuntimes ?? 0, 'number', '0 表示按需启动', false, { min: 0 })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>脚本与容器资源</h2></div></div><div class="form-grid three">${input('scriptMemoryMb', '单运行时脚本内存', config.scriptMemoryMb ?? 512, 'number', '128–8192 MiB', false, { min: 128, max: 8192 })}${input('playerServiceMemoryMb', '账号服务内存', config.playerServiceMemoryMb ?? 1024, 'number', '推荐 1024 MiB', false, { min: 128, max: 262144 })}${input('playerServiceCpuLimit', '账号服务 CPU', config.playerServiceCpuLimit ?? 1, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('authPortalMemoryMb', '登录页面内存', config.authPortalMemoryMb ?? 128, 'number', '推荐 128 MiB', false, { min: 64, max: 262144 })}${input('authPortalCpuLimit', '登录页面 CPU', config.authPortalCpuLimit ?? 0.5, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('creatorMemoryMb', 'Creator 内存', config.creatorMemoryMb ?? 6144, 'number', '推荐 6144 MiB', false, { min: 512, max: 262144 })}${input('creatorCpuLimit', 'Creator CPU', config.creatorCpuLimit ?? 4, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('playMemoryMb', 'Play 内存', config.playMemoryMb ?? 4096, 'number', '推荐 4096 MiB', false, { min: 512, max: 262144 })}${input('playCpuLimit', 'Play CPU', config.playCpuLimit ?? 4, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>回收与传送</h2></div></div><div class="form-grid">${input('runtimeIdleMinutes', '运行时空闲回收（分钟）', config.runtimeIdleMinutes || 15, 'number', '1–10080')}${input('runtimeStartTimeoutMinutes', '运行时启动超时（分钟）', config.runtimeStartTimeoutMinutes || 30, 'number', '1–1440')}${input('teleportMaxRooms', 'Teleport 私有房间上限', config.teleportMaxRooms || 64, 'number', '1–1024')}${input('teleportRoomIdleMinutes', '房间空闲回收（分钟）', config.teleportRoomIdleMinutes || 15, 'number', '1–10080')}</div></div>
          ${setupExplanation('配置说明：容量和回收策略如何选择？', [
            ['游玩运行时', '同时活跃的游玩地图和传送房间数量。人数、地图数越多，需要的上限越高。'],
            ['单实例玩家', '一张地图的一个公共或私有运行实例能够同时容纳的玩家数量。'],
            ['编辑运行时', '同时打开进行编辑的地图数量；编辑器关闭后会按空闲策略回收。'],
            ['创作预览', '创作端点击运行时使用的预览实例数。'],
            [
              '预热数量',
              '提前常驻可减少首次访问等待，但会持续占用 CPU 和内存；设为 0 可按需启动。',
            ],
            ['脚本内存', '每个地图脚本运行时的独立上限，不是整个 Creator 或 Play 容器的总内存。'],
            ['运行时回收', '地图无人连接超过该时间后可被停止；再次访问时会自动启动。'],
            ['启动超时', '大型地图首次迁移和预烘焙允许等待的最长时间。'],
            ['私有房间', '限制 Teleport 可保留的私有房间数量；每个活跃房间仍占用一个游玩运行时。'],
            ['房间回收', '私有房间无人连接超过该时间后，房间 ID 与对应运行时都会失效。'],
            [
              '容量建议',
              '上限越高，Docker 可用内存需求越大。首次部署可保持默认，出现排队再逐步提高。',
            ],
          ])}</section>
        <section class="setup-panel ${state.setupSection === 'security' ? 'active' : ''}" data-setup-panel="security"><div class="config-group"><div class="group-title"><div><h2>玩家与后台权限</h2></div></div><div class="setting-toggle-list">${settingToggle('registrationEnabled', '允许新玩家注册', '关闭后登录页面不再接受自助注册', config.registrationEnabled !== false)}</div></div><div class="config-group"><div class="group-title"><div><h2>管理密钥</h2></div></div><div class="secret-list">${secretCard('playAdminToken', '服主管理令牌', config.hasPlayAdminToken)}${secretCard('playerAuthApiKey', '账号服务 API Key', config.hasPlayerAuthApiKey)}${secretCard('permissionTokenSecret', '运行时身份密钥', config.hasPermissionTokenSecret)}</div></div>${setupExplanation(
          '配置说明：管理密钥分别做什么？',
          [
            ['自动生成', '首次保存配置时，三个密钥会自动生成；只有需要自定义时才填写新的值。'],
            ['开放注册', '关闭后新玩家不能自行注册，但已有玩家、服主和后台管理员仍可正常登录。'],
            [
              '服主管理',
              '使用服主管理令牌登录玩家管理后台后，可管理后台账号、权限组和游玩地图。管理员能看到和操作的功能仍由其权限组决定。',
            ],
            ['密钥操作', '点击编辑可查看并修改完整密钥，也可直接复制；离开页面后会恢复隐藏。'],
            [
              '服主管理令牌',
              '用于验证服主登录，并保护玩家管理后台到游玩端的内部调用；它不直接授予普通管理员页面权限。',
            ],
            ['账号服务 API Key', '供登录、注册或用户接入程序调用账号服务。'],
            ['运行时身份密钥', '用于 Creator 和 Play 之间签发、校验运行时身份。'],
            [
              '修改影响',
              '保存新密钥后，旧会话和使用旧密钥的 API 调用会失效；请安全备份，不要分享。',
            ],
          ],
        )}</section>
        ${rawEnvironmentPanel}
      </div>
      <div class="form-actions submit-actions">${state.setupSection === 'environment' ? `<button class="button primary" type="button" data-save-raw-environment ${state.environmentFileSaving ? 'disabled' : ''}>保存配置</button>` : `<button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>保存配置</button>`}</div>
    </form>`
}

function managedServicePanel(service, info) {
  const isDatabase = service === 'postgresql'
  const label = isDatabase ? 'PostgreSQL 16' : 'Redis 7'
  if (!info?.imageAvailable) {
    return `<div class="managed-install-card"><strong>尚未安装 ${label}</strong><button type="button" class="button primary" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>立即下载</button></div>`
  }
  if (!info?.configured) {
    return `<div class="managed-install-card"><strong>内置 ${label} 已下载</strong><button type="button" class="button primary" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>启用并启动</button></div>`
  }
  const fields = [
    ['地址', info.host],
    ['端口', info.port],
    ...(isDatabase
      ? [
          ['数据库', info.database],
          ['账号', info.user],
        ]
      : [
          ['业务 DB', info.database],
          ['缓存 DB', '1'],
        ]),
    ['密码', info.password],
  ]
  return `<div class="managed-connection-card"><div class="managed-connection-heading"><div><span class="managed-state ${info.running ? 'running' : 'stopped'}">${info.running ? '正在运行' : '当前未运行'}</span><strong>本机连接信息</strong><small>仅监听 127.0.0.1，不会暴露到局域网或公网。</small></div>${info.running ? '' : `<button type="button" class="button" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>启动服务</button>`}</div><dl class="managed-connection-grid">${fields
    .map(
      ([name, value]) =>
        `<div><dt>${name}</dt><dd><code>${escapeHtml(value)}</code><button type="button" class="copy-connection" data-copy-managed="${escapeHtml(value)}" aria-label="复制${name}" title="复制${name}">${icon('copy')}</button></dd></div>`,
    )
    .join(
      '',
    )}<div class="connection-url"><dt>连接地址</dt><dd><code>${escapeHtml(info.connectionUrl)}</code><button type="button" class="copy-connection" data-copy-managed="${escapeHtml(info.connectionUrl)}" aria-label="复制连接地址" title="复制连接地址">${icon('copy')}</button></dd></div></dl></div>`
}
