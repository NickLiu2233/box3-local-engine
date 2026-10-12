import { state } from '../../core/state.js'
import { escapeHtml } from '../../ui/html.js'

/** External Nginx is owned by the operator; this view never submits network fields. */
export function externalNginxGuide() {
  const config = state.config || {}
  const services = [
    ['Play', 'play', 'playPort', 3121, 'BOX_PLAY'],
    ['ARENA', 'arena', 'creatorPort', 3127, 'BOX_CREATOR'],
    ['VOXA', 'voxa', 'voxaPort', 3123, 'BOX_VOXA'],
    ['登录页面', 'accounts', 'authPortalPort', 3125, 'BOX_AUTH_PORTAL'],
    ['后台管理', 'admin', 'playerServicePort', 3124, 'BOX_PLAYER_SERVICE'],
  ]
  const environment = [
    'BOX_PLAY_NETWORK_MODE=public',
    'BOX_CREATOR_NETWORK_MODE=public',
    'BOX_BIND_IP=127.0.0.1',
    'BOX_CREATOR_BIND_IP=127.0.0.1',
    'BOX_VOXA_BIND_IP=127.0.0.1',
    ...services.map(([, prefix, , , key]) => `${key}_PUBLIC_ADDRESS_OVERRIDE=https://example.com/${prefix}`),
  ].join('\n')
  const locations = services.map(([, prefix, key, fallback]) => {
    const port = Number(config[key]) || fallback
    return `    location = /${prefix} { return 308 /${prefix}/$is_args$args; }
    location ^~ /${prefix}/ {
        rewrite ^/${prefix}(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $box_connection;
        proxy_read_timeout 3600s;
    }`
  }).join('\n')
  const nginx = `# 放入 Nginx 的 http 配置区
map $http_upgrade $box_connection { default upgrade; '' close; }
server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
${locations}
}`
  return `<div class="config-group"><h2>外部 Nginx：手动配置</h2>
    <p>外部入口由你维护，此页面不提供访问范围、地址、路径和证书的快捷配置，也不会修改或重载你的 Nginx。</p>
    <p>1. 在“原始 .env”中填写实际公开地址。下面的 example.com 和路径只是示例，请与 Nginx 保持一致。</p>
    <pre><code>${escapeHtml(environment)}</code></pre>
    <p>2. 在服务器的 Nginx 配置文件中设置代理和 SSL。上游使用同机服务端口；远程代理应使用实际内网地址，并明确配置服务监听范围。</p>
    <pre><code>${escapeHtml(nginx)}</code></pre>
    <p>3. 保存 .env 后重新启动对应引擎服务，再执行 <code>nginx -t</code> 和 <code>nginx -s reload</code>。证书续签及 Nginx 重载由你的签发工具维护。</p>
    <p>纯 HTTP 入口可将公开地址改为 http://，使用 listen 80，并移除 SSL 两行。公网访问还需要正确的域名解析和端口开放。</p>
  </div>`
}
