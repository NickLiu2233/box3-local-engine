import { escapeHtml } from '../ui/html.js'
import { formatBeijingBuildTime, formatBuildSource } from '../utils/format.js'
import { hasWebManagerToken, isWebManager } from '../infrastructure/transport.js'
import { icon } from '../ui/icons.js'
import { state } from '../core/state.js'

export function about() {
  const info = state.about || {}
  const legal = state.legal || {}
  const managementAvailable = !isWebManager() || hasWebManagerToken()
  // Add later releases at the top. The about page deliberately keeps this
  // public-facing: no internal URLs, credentials, or implementation details.
  const releaseNotes = [
    {
      version: '0.2.0',
      date: '2026 年 9 月 23 日',
      summary: '玩家管理、CLI 与服务器部署更新',
      sections: [
        {
          title: '玩家管理',
          items: [
            '全新玩家管理后台，集中管理玩家、封禁、创作权限、CLI Token、游玩地图和容器资源。',
            '权限组细分为查看与编辑权限；编辑权限会自动包含对应查看权限，菜单和接口同步校验。',
            '完善管理员账号、权限组、审计记录和 CLI Token 的创建、编辑、停用与撤销流程。',
          ],
        },
        {
          title: 'CLI 与 API',
          items: [
            '新增 Creator CLI，可在本地使用 TypeScript 管理工程、资源、共享脚本和数据空间。',
            '支持启动和控制预览运行时、实时读取调试输出，以及按视图截取场景画面。',
            'CLI Token 支持按能力授权、编辑范围和撤销，并在签发后单独展示一次完整 Token。',
          ],
        },
        {
          title: '地图与容器',
          items: [
            '玩家管理后台新增游玩地图与容器管理，可按地图配置独立容器、资源组和空闲回收策略。',
            '资源组支持 CPU、内存、网络策略、进程上限和带宽限制，并展示运行时资源状态。',
            '完善地图组、副地图和传送房间支持，独立容器在 Docker 中使用清晰的项目与服务标识。',
          ],
        },
        {
          title: '部署与修复',
          items: [
            '新增 Linux 一键安装与更新脚本，支持自动安装 Docker，并优先从 BOX3 CDN 下载发行包。',
            '桌面端与 Linux Web 管理端统一访问范围设置，避免游玩端与创作端网络配置冲突。',
            '修复独立运行时状态误判、传送房间标识兼容、客户端调试日志和代理 IP 识别等问题。',
          ],
        },
      ],
    },
    {
      version: '0.1.1',
      date: '2026 年 9 月 11 日',
      summary: '渲染 API 与本地部署体验更新',
      sections: [
        {
          title: 'API',
          items: [
            '服务端脚本新增 world.globalLight，用于调节整体场景光照强度。',
            '服务端脚本新增 world.gamma，用于调节最终画面显示曲线。',
          ],
        },
        {
          title: '功能',
          items: [
            '优化服务总览分组展示，支持外部数据服务状态显示并验证数据库连接。',
            '数据空间兼容 BOXES PostgreSQL 表结构并优化历史数据读取。',
            '新增用户 Key 绑定同步，并优化本地运行时身份与导出弹框标题显示。',
          ],
        },
        {
          title: '修复',
          items: [
            '修复无作品时打开工程运行时导致启动器卡死的问题。',
            '修复登录页面通过服务器 IP、局域网地址或域名访问时误报请求来源的问题。',
          ],
        },
      ],
    },
    {
      version: '0.1.0',
      date: '2026 年 9 月 4 日',
      summary: '本地部署版首次发布',
      sections: [
        {
          title: '工程与发布',
          items: [
            '创作端与游玩端分离部署：创作者编辑工程，玩家只运行已发布的游玩包。',
            '支持地图工程、游玩包和 VOXA 模型工程的导入、导出与本地备份。',
            '支持地图组与传送房间；同一作品可由主地图和多个独立副地图组成。',
          ],
        },
        {
          title: '内容创作',
          items: ['模型、皮肤和动画可通过 VOXA 本地保存，并在创作和游玩中使用。'],
        },
        {
          title: '部署与数据',
          items: [
            '提供账号服务与 PostgreSQL 数据空间，保存账号、权限、会话和地图脚本持久数据。',
            '提供桌面启动器与 Linux Web 管理端，集中管理服务、端口、数据和备份。',
          ],
        },
      ],
    },
  ]
  const values = [
    ['启动器版本', info.applicationVersion || (managementAvailable ? '读取中' : '登录后查看')],
    ['引擎开发', '深圳奇梦岛科技有限公司'],
    ['构建时间', formatBeijingBuildTime(info.buildCreatedAt)],
  ]
  const serviceImages = Array.isArray(info.serviceImages) ? info.serviceImages : []
  const imageRows = serviceImages.length
    ? serviceImages
        .map(
          (service) => `<details class="about-image-row">
            <summary><span class="about-image-summary"><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.tag)} · ${escapeHtml(service.platform)} · ${escapeHtml(formatBeijingBuildTime(service.createdAt))}</small></span><span class="about-image-disclosure">详情</span></summary>
            <dl class="about-image-meta">
              <div><dt>镜像名称</dt><dd>${escapeHtml(service.image)}</dd></div>
              <div><dt>镜像标识</dt><dd>${escapeHtml(service.imageId)}</dd></div>
              <div><dt>构建提交</dt><dd>${escapeHtml(service.sourceRevision || '未知')}</dd></div>
              <div><dt>构建来源</dt><dd>${escapeHtml(formatBuildSource(service.buildSource))}</dd></div>
            </dl>
          </details>`,
        )
        .join('')
    : `<div class="about-image-empty">${managementAvailable ? '正在读取组件镜像信息…' : '登录管理平台后可查看组件镜像信息。'}</div>`
  const changelogRows = releaseNotes
    .map(
      (release) => `<details class="about-changelog-row">
        <summary>
          <span class="about-changelog-summary"><strong>v${escapeHtml(release.version)}</strong><small>${escapeHtml(release.date)} · ${escapeHtml(release.summary)}</small></span>
          <span class="about-image-disclosure">详情</span>
        </summary>
        <div class="about-changelog-sections">${release.sections
          .map(
            (section) => `<section class="about-changelog-section">
              <h3>${escapeHtml(section.title)}</h3>
              <ol>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
            </section>`,
          )
          .join('')}</div>
      </details>`,
    )
    .join('')

  const protectedDocuments = managementAvailable
    ? `<button class="about-document-row" id="open-community-group"><span><strong>服主交流QQ群：1107448537</strong><small>加入交流群，与其他服主交流部署与运营经验。</small></span><em>加入</em>${icon('external')}</button><button class="about-document-row" id="export-about-diagnostics" ${state.busy ? 'disabled' : ''}><span><strong>导出脱敏诊断包</strong><small>包含服务状态与日志，不包含密码、密钥或 API Key。</small></span><em>导出</em>${icon('archive')}</button>`
    : ''
  const licenseDocument = `<button class="about-document-row" data-open-legal-document="license"><span><strong>发行许可证</strong><small>${escapeHtml(legal.licenseName || '正在读取许可证信息')}</small></span><em>查看全文</em>${icon('chevron')}</button>`
  return `<header><div><h1>关于</h1></div></header><section class="about-page">
    <article class="about-release-card"><dl class="about-release-facts">${values.map(([label, value, title = value]) => `<div><dt>${label}</dt><dd title="${escapeHtml(title || '')}">${escapeHtml(value)}</dd></div>`).join('')}</dl></article>
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>更新日志</h2></div><div class="about-changelog-list">${changelogRows}</div></article>` : ''}
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>服务组件</h2></div><div class="about-image-list">${imageRows}</div></article>` : ''}
    <article class="about-card"><div class="about-card-heading"><h2>${managementAvailable ? '社区与许可' : '许可证'}</h2></div><div class="about-document-list">${protectedDocuments}${licenseDocument}</div></article>
  </section>`
}
