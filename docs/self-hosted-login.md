# 自建登录门户

默认登录门户是参考实现，可替换为服主自己的网页。自建门户必须由服务端持有 `BOX_PLAYER_AUTH_API_KEY` 并代理 Player Service 请求；浏览器不能直接携带该密钥。

配置 `BOX_PLAYER_LOGIN_URL` 为门户地址，并将门户 Origin 写入 `BOX_PLAYER_AUTH_ALLOWED_ORIGINS`。公网使用 HTTPS，并只允许明确的回跳地址；不要使用 `*`、开放跳转或把 Cookie、Token 放入 URL。

推荐链路为：浏览器提交到登录门户，门户服务端调用 Player Service，Player Service 写入 `HttpOnly` Cookie，再跳回经过白名单校验的 Creator 或 Play 地址。注册关闭时，门户必须同时隐藏注册入口并拒绝注册接口。

## 在自己的页面调用账号接口

登录门户已提供登录、注册、会话查询、退出、修改昵称和修改密码接口。浏览器调用同源的 `/api/auth/*`，无需知道服务端密钥。例如修改昵称：

```js
const response = await fetch('/api/auth/profile', {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ displayName: '新昵称' }),
})
const result = await response.json()
if (!response.ok) throw new Error(result.message)
```

修改密码：

```js
const response = await fetch('/api/auth/password', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentPassword, newPassword }),
})
const result = await response.json()
if (!response.ok) throw new Error(result.message)
if (result.reloginRequired) window.location.assign('/')
```

只开放昵称修改，没有头像修改接口。两个接口都只操作当前玩家；请求中不要传用户 ID 或权限字段。改密成功后所有登录会话撤销，应引导玩家重新登录。完整模型和错误码由 `@box/apis` 的 OpenAPI 维护，详见 [Player Service API](./player-service-api.md)。

使用生成的客户端时，`patchApiAuthProfile({ body: { displayName } })` 和 `postApiAuthPassword({ body: { currentPassword, newPassword } })` 提供相同能力；创建 `ApiClient` 时设置登录门户 `baseUrl` 和 `credentials: 'include'` 即可。

## 在启动器替换镜像

打开 **数据配置 → 访问设置 → 账号服务**，填写本机 Docker 已有的“登录页面镜像”（例如 `my-login:1.0`），点击“保存配置”。启动器只读取本机镜像，不会从仓库自动拉取；请先自行构建或通过 `docker load` 导入镜像。正在运行的登录页面会自动重建，尚未启动时在下次启动使用。引擎升级会保留这个选择。

对应环境变量是 `BOX_AUTH_PORTAL_IMAGE`；留空时使用当前引擎版本的默认镜像。

恢复默认：点击“恢复默认”，再保存配置。本机镜像不存在、平台不匹配或启动失败时配置仍会保留，页面会显示错误，方便修正镜像名或恢复默认。

镜像需要支持所在平台 `linux/amd64` 或 `linux/arm64`，监听 `0.0.0.0:3214`，提供 `GET /api/health-check`，并在镜像中定义 Docker `HEALTHCHECK`。自定义镜像沿用默认容器的只读根目录和 `/tmp` 可写空间；资源限制可以在“运行容量”中调整。命令行启动选定镜像时使用 `--no-build`，不要把默认源码重新构建到自定义镜像名称下。

启动器自动传入以下变量，无需服主逐个填写：

| 环境变量 | 用途 |
| --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `3214` |
| `BOX_PLAYER_SERVICE_INTERNAL_URL` | Docker 内部 Player Service 地址 |
| `BOX_PLAYER_AUTH_API_KEY` | 服务端代理接口凭据，不能发送给浏览器 |
| `BOX_AUTH_PORTAL_PUBLIC_URL` | 登录页面对外地址 |
| `BOX_CREATOR_PUBLIC_URL` / `BOX_PLAY_PUBLIC_URL` | 合法回跳来源 |
| `BOX_PLAYER_REGISTRATION_ENABLED` | 是否允许注册 |

原来的 `AUTH_DEMO_*` 变量也继续提供。接口兼容约定见[默认门户说明](../apps/player-auth-portal/README.md)：实现 `/api/auth/login`、`register`、`session`、`logout`，转发上游全部 `Set-Cookie`，支持 `source` 和 `returnUrl`，只允许返回已配置的 Creator / Play 地址。

## 从默认门户制作自己的镜像

最简单的方式是复用默认服务器，只替换页面资源。先复制 `apps/player-auth-portal/public/` 到自己的构建目录，再修改 HTML、CSS 和品牌资源，保留现有登录逻辑。使用[镜像模板](../apps/player-auth-portal/examples/custom-image/Dockerfile)构建：

先通过启动器启动一次默认登录页面，确保基础镜像已经导入本机 Docker。

```sh
docker build --build-arg BASE_IMAGE=box-local-engine-player-auth-portal:0.2.0 \
  -f /path/to/custom-image/Dockerfile -t your-name/login:1.0 /path/to/your-login
```

该模板继承默认服务接口、端口、健康检查和启动流程。也可以完全自己实现兼容服务；将镜像提前构建或导入本机 Docker 后再填写，启动器不会访问镜像仓库。

上线前验证注册/登录、单设备会话替换、会话续期、退出、错误回跳、注册关闭和跨域拒绝行为。门户不可记录明文密码、完整 Cookie 或 API Key。
