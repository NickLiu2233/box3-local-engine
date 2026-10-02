import { escapeHtml } from '../ui/html.js'
import { formatBeijingBuildTime } from '../utils/format.js'
import { icon } from '../ui/icons.js'
import { state } from '../core/state.js'

export function licenseManagement() {
  const license = state.license || {}
  const statusLabel = license.valid ? '有效' : license.installed ? '不可用' : '未安装'
  const deviceId = license.deviceId || '读取中'
  const maskedDeviceId =
    deviceId.length > 18 ? `${deviceId.slice(0, 12)}***${deviceId.slice(-6)}` : deviceId
  const shownDeviceId = state.licenseDeviceVisible ? deviceId : maskedDeviceId
  const details = license.valid
    ? `<dl class="license-facts"><div><dt>许可证</dt><dd>${escapeHtml(license.licenseId)}</dd></div><div><dt>起始时间</dt><dd>${escapeHtml(formatBeijingBuildTime(license.issuedAt))}</dd></div><div><dt>到期时间</dt><dd>${escapeHtml(formatBeijingBuildTime(license.expiresAt))}</dd></div><div><dt>使用范围</dt><dd>仅限个人学习和非商业用途</dd></div></dl>`
    : ''
  return `<header class="license-header"><div><h1>许可证管理 <span class="license-state ${license.valid ? 'valid' : ''}">${statusLabel}</span></h1></div></header><section class="license-page">
    <article class="license-panel">
      <div class="license-status-row"><div class="license-status-main"><div><strong>个人学习许可证</strong></div><p>仅限个人学习、测试；不可商业使用或二次分发。</p></div><button class="license-group-link" type="button" data-open-community-group>申请个人学习许可证 ${icon('chevron')}</button></div>${details}
      <section class="license-section"><div class="license-device"><div><span>设备 ID</span><code class="${state.licenseDeviceVisible ? 'revealed' : ''}">${escapeHtml(shownDeviceId)}</code></div><div class="license-device-actions"><button class="icon-button" id="toggle-license-device" aria-label="${state.licenseDeviceVisible ? '隐藏设备 ID' : '显示设备 ID'}" title="${state.licenseDeviceVisible ? '隐藏设备 ID' : '显示设备 ID'}" ${license.deviceId ? '' : 'disabled'}>${icon(state.licenseDeviceVisible ? 'eye-off' : 'eye')}</button><button class="button" id="copy-license-device" ${license.deviceId ? '' : 'disabled'}>${icon('copy')}复制</button></div></div></section>
      <section class="license-section license-import"><label class="license-token-label" for="license-token">许可证密钥</label><textarea id="license-token" class="license-token-input" rows="5" placeholder="请粘贴许可证密钥" spellcheck="false"></textarea><button class="button primary" id="install-license" ${state.busy ? 'disabled' : ''}>验证并激活</button></section>
    </article>
  </section>`
}
