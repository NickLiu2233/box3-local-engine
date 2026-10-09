import { state } from '../core/state.js'
import { escapeHtml } from './html.js'

export function updateDialog() {
  const release = state.updateRelease
  const targets = [
    ['windows-amd64', 'Windows x64'],
    ['windows-arm64', 'Windows ARM64'],
    ['macos-arm64', 'macOS Apple Silicon'],
    ['linux-amd64', 'Linux x64'],
    ['linux-arm64', 'Linux ARM64'],
  ]
  return `<div class="dialog-backdrop update-backdrop" data-update-dismiss><section class="start-dialog update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title" tabindex="-1"><header><div><h2 id="update-title">发现新版本 ${escapeHtml(release.version)}</h2><p>${escapeHtml(release.date)}</p></div><button class="dialog-close" id="close-update-dialog" aria-label="关闭">×</button></header><p>${escapeHtml(release.summary)}</p><div class="update-notes">${release.sections.map((section) => `<section><h3>${escapeHtml(section.title)}</h3><ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`).join('')}</div><label class="field"><span>安装包平台</span><select id="update-download-target">${targets.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><div class="dialog-actions"><button class="button" id="dismiss-update">稍后</button><button class="button primary" id="open-update-download">下载新版</button></div></section></div>`
}
