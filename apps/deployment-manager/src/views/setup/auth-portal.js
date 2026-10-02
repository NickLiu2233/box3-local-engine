import { state } from '../../core/state.js'
import { input } from '../../ui/forms.js'

export function authPortalImageSetting() {
  return `<div class="login-image-setting">
    ${input('authPortalImage', '登录页面镜像', state.config?.authPortalImage || '', 'text', '仅使用本机 Docker 镜像，留空使用默认镜像', false, { placeholder: '例如 my-login:1.0' })}
    <button type="button" class="text-button login-image-reset" id="restore-default-login-image" ${state.busy ? 'disabled' : ''}>恢复默认</button>
  </div>`
}
