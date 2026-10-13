import releaseNotes from '../../../../distribution/release-notes.json';
import { escapeHtml } from '../ui/html.js';
import { formatBeijingBuildTime, formatBuildSource } from '../utils/format.js';
import { hasWebManagerToken, isWebManager } from '../infrastructure/transport.js';
import { icon } from '../ui/icons.js';
import { state } from '../core/state.js';

export function about() {
    const info = state.about || {};
    const legal = state.legal || {};
    const managementAvailable = !isWebManager() || hasWebManagerToken();
    const values = [
        ['启动器版本', info.applicationVersion || (managementAvailable ? '读取中' : '登录后查看')],
        ['引擎开发', '深圳奇梦岛科技有限公司'],
        ['构建时间', formatBeijingBuildTime(info.buildCreatedAt)],
    ];
    const serviceImages = Array.isArray(info.serviceImages) ? info.serviceImages : [];
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
        : `<div class="about-image-empty">${managementAvailable ? '正在读取组件镜像信息…' : '登录管理平台后可查看组件镜像信息。'}</div>`;
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
        .join('');

    const protectedDocuments = managementAvailable
        ? `<button class="about-document-row" id="open-community-group"><span><strong>服主交流QQ群：1107448537</strong><small>加入交流群，与其他服主交流部署与运营经验。</small></span><em>加入</em>${icon('external')}</button><button class="about-document-row" id="export-about-diagnostics" ${state.busy ? 'disabled' : ''}><span><strong>导出脱敏诊断包</strong><small>包含服务状态与日志，不包含密码、密钥或 API Key。</small></span><em>导出</em>${icon('archive')}</button>`
        : '';
    const licenseDocument = `<button class="about-document-row" data-open-legal-document="license"><span><strong>发行许可证</strong><small>${escapeHtml(legal.licenseName || '正在读取许可证信息')}</small></span><em>查看全文</em>${icon('chevron')}</button>`;
    return `<header><div><h1>关于</h1></div></header><section class="about-page">
    <article class="about-release-card"><dl class="about-release-facts">${values.map(([label, value, title = value]) => `<div><dt>${label}</dt><dd title="${escapeHtml(title || '')}">${escapeHtml(value)}</dd></div>`).join('')}</dl></article>
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>更新日志</h2></div><div class="about-changelog-list">${changelogRows}</div></article>` : ''}
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>服务组件</h2></div><div class="about-image-list">${imageRows}</div></article>` : ''}
    <article class="about-card"><div class="about-card-heading"><h2>${managementAvailable ? '社区与许可' : '许可证'}</h2></div><div class="about-document-list">${protectedDocuments}${licenseDocument}</div></article>
  </section>`;
}
