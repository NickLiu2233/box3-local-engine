# BOX3 自定义登录门户开发须知

本文可以单独交给开发者或 AI 编程助手：不必先阅读其他文档，即可据此编写、构建和接入使用 BOX3 现有玩家账号体系的自定义登录门户。

依据：当前 Local Engine `0.2.0` 源码，包含昵称修改和密码修改接口。示例域名、账号、密码、密钥均为占位内容。升级引擎时须重新核对接口；相同版本号的历史镜像也不一定包含最新功能。

## 1. 开发目标与能力边界

登录门户是“自己的页面 + 可信服务端代理”，不是另一套账号系统。

需要实现：

- 玩家登录、注册开关、会话查询、退出登录。
- 已登录玩家修改自己的昵称、验证原密码后修改自己的密码。
- 登录后安全返回游玩端或创作端。
- 输入错误、登录失效、封禁、限流、连接失败等反馈。
- 可以导入本机 Docker 的镜像，兼容启动器的配置与健康检查。

当前没有提供、不要自行假定存在的能力：

- 头像上传或修改。历史响应中的 `avatarSkinId` 是内置皮肤资料，不是头像接口。
- 游客登录、客户端指定玩家身份、角色或权限。
- 邮箱、短信、验证码、OAuth、第三方账号自动绑定。
- 未验证原密码的“忘记密码”自助重置。
- 任意玩家查询、管理员管理、服主操作等普通玩家权限之外的功能。

不要自己保存玩家密码、生成 BOX3 会话、复制账号数据库或直接操作 PostgreSQL。忘记密码应联系服主，在授权管理后台处理；不要为了实现找回密码，把管理员重置接口代理给普通浏览器。

### 1.1 两种实现方式

| 方式 | 适用场景 | 要自己实现什么 |
| --- | --- | --- |
| A：继承默认门户镜像，只替换静态页面，推荐 | 自定义品牌、样式、前端框架与交互 | 页面调用同源 `/api/auth/*`；保留默认后端、健康检查和启动流程 |
| B：完全自建门户服务 | 自己的服务端框架、路由、资源服务或扩展功能 | 六个代理接口、来源校验、Cookie 转发、回跳校验、异常处理、容器启动和健康检查 |

方式 A 的浏览器不直接调用底层接口，也不持有服务密钥。只有方式 B 的后端需要自己调用 `/api/player-auth/*`。

## 2. 架构与默认地址

```text
浏览器 → 同源登录门户 /api/auth/*
       → 门户后端携带服务密钥、Cookie、可信来源信息
       → Player Service /api/player-auth/*
       ← JSON、HTTP 状态、Set-Cookie、Retry-After
       ← 门户转发，浏览器保存 HttpOnly Cookie
浏览器 → 安全回跳至 Play / Creator，由目标端再次验证身份与权限
```

| 组件 | 职责 | 不应承担的职责 |
| --- | --- | --- |
| 页面 | 输入、显示状态、调用同源接口、执行安全回跳 | 保存密钥、读写会话 token、决定权限 |
| 门户后端 | 配置与密钥、固定代理、来源和回跳校验 | 签发身份、计算密码哈希、修改身份数据库 |
| Player Service | 账号、密码、会话、设备绑定、封禁、权限和审计 | 门户视觉设计 |
| Creator / Play | 从 Player Service 验证身份，检查自身权限 | 信任浏览器传入的角色或身份 ID |

### 2.1 宿主机与容器端口不同

| 服务 | 宿主机默认地址 | 同一 Compose 网络内部地址 |
| --- | --- | --- |
| 登录门户 | `http://127.0.0.1:3125` | `http://player-auth-portal:3214` |
| Player Service | `http://127.0.0.1:3124` | `http://player-service:3213` |
| 游玩端 | `http://127.0.0.1:3121` | 门户不需要调用它的内部身份接口 |
| 创作端 | `http://127.0.0.1:3127` | 门户不需要调用它的内部身份接口 |

在门户容器中，`127.0.0.1` 指门户自己。启动器部署应使用注入的 `http://player-service:3213`，不能硬编码 `http://127.0.0.1:3124`。只有两个服务都直接运行在宿主机的源码模式，才使用后者。

公网 URL 要显式指定协议，例如 `http://auth.example.com:3125` 或 `https://auth.example.com`。域名不等于自动启用 TLS，也不等于已经配置反向代理；DNS、证书、代理或端口映射由部署者负责。

## 3. 环境变量和凭据

启动器同时注入标准变量和兼容变量。完全自建后端建议读取标准变量，兼容旧名称；继承默认后端时保留兼容变量。

| 标准变量或引擎配置 | 默认后端读取的兼容变量 | 用途 |
| --- | --- | --- |
| `HOST` | `AUTH_DEMO_HOST` | 容器监听 `0.0.0.0` |
| `PORT` | `AUTH_DEMO_PORT` | 容器端口 `3214`，不是宿主机端口 |
| `BOX_PLAYER_SERVICE_INTERNAL_URL` | `AUTH_DEMO_PLAYER_SERVICE_URL` | 上游内部 URL，通常 `http://player-service:3213` |
| `BOX_PLAYER_AUTH_API_KEY` | `AUTH_DEMO_API_KEY` | 与 Player Service 相同的服务端密钥，至少 16 字符 |
| `BOX_AUTH_PORTAL_PUBLIC_URL` | `AUTH_DEMO_PUBLIC_URL` | 门户外部 URL |
| `BOX_CREATOR_PUBLIC_URL` | `AUTH_DEMO_CREATOR_URL` | 创作端安全回跳基准 URL |
| `BOX_PLAY_PUBLIC_URL` | `AUTH_DEMO_PLAY_URL` | 游玩端安全回跳基准 URL |
| `BOX_PLAYER_REGISTRATION_ENABLED` | `AUTH_DEMO_REGISTRATION_ENABLED` | `false` 关闭注册，正常配置为 `true` |
| Compose 的 `BOX_AUTH_PORTAL_REQUEST_TIMEOUT_MS` | `AUTH_DEMO_REQUEST_TIMEOUT_MS` | 默认 10000 ms，默认后端允许 1000–60000 ms |
| Compose 的 `BOX_TRUST_PROXY` | `AUTH_DEMO_TRUST_PROXY` | 只有明确为 `true` 才信任代理头 |

当前模板由 `server/config.js` 读取配置：优先使用标准 `BOX_*`、`HOST`、`PORT`，同时兼容 `AUTH_DEMO_*`。旧镜像可能只读取兼容变量，因此启动器仍同时注入两套名称；不要据此移除旧部署所需配置。

完全自建后端读取示例：

```js
const env = process.env
const config = {
  host: env.HOST || env.AUTH_DEMO_HOST || '0.0.0.0',
  port: Number(env.PORT || env.AUTH_DEMO_PORT || 3214),
  serviceUrl: env.BOX_PLAYER_SERVICE_INTERNAL_URL || env.AUTH_DEMO_PLAYER_SERVICE_URL,
  apiKey: env.BOX_PLAYER_AUTH_API_KEY || env.AUTH_DEMO_API_KEY,
  portalUrl: env.BOX_AUTH_PORTAL_PUBLIC_URL || env.AUTH_DEMO_PUBLIC_URL,
  creatorUrl: env.BOX_CREATOR_PUBLIC_URL || env.AUTH_DEMO_CREATOR_URL,
  playUrl: env.BOX_PLAY_PUBLIC_URL || env.AUTH_DEMO_PLAY_URL,
  registrationEnabled: String(env.BOX_PLAYER_REGISTRATION_ENABLED || env.AUTH_DEMO_REGISTRATION_ENABLED || 'true').trim().toLowerCase() !== 'false',
  trustProxy: env.AUTH_DEMO_TRUST_PROXY === 'true',
  timeoutMs: Number(env.AUTH_DEMO_REQUEST_TIMEOUT_MS || 10000),
}
```

这只是读取示例，仍须启动前验证 URL 仅为 HTTP/HTTPS、密钥至少 16 字符、端口为合法整数、超时在允许范围。不用 `Boolean('false')` 判断开关。

### 3.1 三种秘密不能混用

- `BOX_PLAYER_AUTH_API_KEY`：门户调用玩家认证接口的服务密钥。
- `BOX_PLAY_ADMIN_TOKEN`：服主凭据，不用于普通玩家门户。
- `PERMISSION_TOKEN_SECRET`：其他内部身份通信秘密，不用于本文的门户认证接口。

后两者不要成为自定义登录页面的配置项。服务密钥只能在运行时后端读取，不能写进 Dockerfile、镜像层、静态 JS、HTML、Git、URL 或错误响应。不要用 `VITE_*`、`NEXT_PUBLIC_*` 等公开构建变量存它。

页面可知道显示配置、注册开关和安全导航地址，不需要知道内部上游 URL 或服务密钥。日志不记录明文密码、完整 Cookie、完整认证头；配置示例只用占位值。

“至少 16 字符”只是接口最低校验，不是建议的密钥强度。生产使用密码学安全随机生成的密钥，例如 32 字节随机值编码为 hex；不要使用本文示例、用户名、域名或可猜测短语。轮换时同步更新门户与 Player Service 的运行时配置并重建对应容器。

## 4. 两层接口总表

| 功能 | 浏览器请求门户 | 门户后端请求底层 Player Service | 玩家会话 |
| --- | --- | --- | --- |
| 登录 | `POST /api/auth/login` | `POST /api/player-auth/login` | 不要求，但有 Cookie 仍转发 |
| 注册 | `POST /api/auth/register` | `POST /api/player-auth/register` | 不要求；已登录时不应注册 |
| 会话 | `GET /api/auth/session` | `GET /api/player-auth/session` | 可无，未登录为 player null |
| 退出 | `POST /api/auth/logout` | `POST /api/player-auth/logout` | 转发并清除当前会话 |
| 改昵称 | `PATCH /api/auth/profile` | `PATCH /api/player-auth/profile` | 必需 |
| 改密码 | `POST /api/auth/password` | `POST /api/player-auth/password` | 必需，并验证原密码 |

底层六个接口都需要 `X-Box-Player-Auth-Key`，包括 session 和 logout。它只证明门户服务身份，不能代替玩家会话。

这些底层接口只在 `player-service` 模式提供；请求 Play 或 Creator 上同名路径可能是 404。`/api/player-internal/*` 和 `/api/play-admin/*` 不是普通自建门户应使用的接口，不要为了方便把它们一起代理出来。

默认门户写请求要求 `Content-Type: application/json`，正文必须是 JSON 对象，限制 32 KiB。不要用表单编码、multipart 或文件上传。

### 4.1 门户到底层的请求头

| 请求头 | 要求 |
| --- | --- |
| `X-Box-Player-Auth-Key` | 后端从运行时环境注入，不信任浏览器提交的同名头 |
| `Accept: application/json` | 接收 JSON |
| `Content-Type: application/json` | 有 JSON 正文时设置 |
| `Cookie` | 转发浏览器原请求，保留登录和设备两个 Cookie；GET 也要转发 |
| `User-Agent` | 转发浏览器 UA，默认实现最多 512 字符 |
| `X-Forwarded-For` / `X-Real-IP` | 门户确定的真实客户端 IP；不直接信任浏览器的同名头 |
| `X-Forwarded-Proto` | 可信确定的外部 http/https 协议，与 Secure 策略有关 |
| `Origin` | 如发送，必须是底层允许的外部 Origin，不是 Docker 内部 URL |

默认门户在自己这层检查浏览器来源，不把浏览器 Origin 原样转发给底层。没有 Origin 的服务到服务请求仍需有效密钥。如果自建后端主动发送 Origin，应使用已验证的门户外部 Origin，并加入底层白名单。

底层有凭据型 CORS 不代表可以把密钥交给前端。OPTIONS 成功也不等于拥有账号接口权限。

## 5. 接口详细契约

下方登录、注册、会话中的 player 示例是字段子集。实际还可能包含内置皮肤、权限、时间、IP 或其他账号资料；页面只取所需字段，不能把响应当作客户端可修改的授权凭据。

### 5.1 登录

门户请求正文：

```json
{"username":"player_01","password":"example-password-123","source":"play","returnUrl":"https://play.example.com/"}
```

门户向底层只发送 username 和 password。source、returnUrl 是导航参数，在门户层处理。

成功为 200；门户可加入已校验的 returnUrl：

```json
{
  "player": {
    "subjectId": "0123456789abcdef0123456789abcdef",
    "userId": "42",
    "username": "player_01",
    "displayName": "玩家一号",
    "role": "player",
    "status": "active"
  },
  "returnUrl": "https://play.example.com/"
}
```

- 用户名 trim 后查询，不区分大小写。
- 密码按原字符串提交，不 trim、不转换大小写、不自行哈希。
- 错误凭据通常为 401 和 `{ "message": "用户名或密码错误" }`，不一定有 code。
- 账号封禁可能为 403，附带 banReason、bannedUntil；期限可为 null。
- 当前所有玩家身份采用单设备会话，新登录会撤销旧会话，不只针对 player 角色。
- 登录成功不自动授予创作权限，Creator 仍会检查。
- 不自动重试登录 POST，重复成功登录可能再次替换会话。

### 5.2 注册

门户请求：

```json
{"username":"player_01","displayName":"玩家一号","password":"example-password-123","source":"creator","returnUrl":"https://edit.example.com/"}
```

底层只接收 username、displayName、password。

| 字段 | 规则 |
| --- | --- |
| username | trim 后匹配 `^[a-zA-Z][a-zA-Z0-9_]{2,31}$`，3–32 位，字母开头，重名忽略大小写 |
| displayName | trim 后 1–32 个 JS 字符长度单位，不允许换行，支持中文 |
| password | 原字符串长度 10–128，不 trim、不哈希 |

成功为 201，返回 player 并创建会话，不需再重复登录。确认密码只用于前端比较，不传底层。长度按 JavaScript 字符串计算，部分 emoji 不一定只占一个长度单位。

注册关闭必须同时：隐藏页面入口、关闭门户后端注册路由、遵守底层开关。会话返回的 registrationEnabled 为 false 也应关闭入口。默认门户拒绝注册为 403 REGISTRATION_DISABLED。

实际历史差异：直接调用底层注册时，注册关闭目前也可能返回 400 和中文 message；不能只识别 403。当前底层注册路由没有可依赖的固定注册限流响应契约，公开自建门户应额外实现注册限流，不把旧说明里的配额当成保证。

### 5.3 查询会话

```http
GET /api/auth/session?source=play&returnUrl=https%3A%2F%2Fplay.example.com%2F
```

有有效会话时为 200：

```json
{"player":{"subjectId":"0123456789abcdef0123456789abcdef","userId":"42","username":"player_01","displayName":"玩家一号","status":"active"},"databaseEnabled":true,"registrationEnabled":true,"returnUrl":"https://play.example.com/"}
```

未登录通常仍为 200：

```json
{"player":null,"databaseEnabled":true,"registrationEnabled":true}
```

- player null 是正常未登录，不是服务器故障。
- 查询会话也可能设置设备 Cookie，必须转发 Set-Cookie。
- IP/设备封禁可能为 403；身份服务异常可能为 503。
- 查询成功不保证 player.status 一定 active，页面需检查。
- 首次打开先查会话，再显示表单或账号页，不先闪出错误界面。
- 不根据 databaseEnabled 伪造免登录；不高频轮询。

### 5.4 退出

`POST /api/auth/logout`，JSON 正文为 `{}`。成功 200：

```json
{"loggedOut":true}
```

转发当前 Cookie 和底层清除会话的 Set-Cookie；成功后清空 player 内存状态并返回登录表单。只删除 localStorage 或清空页面展示不算退出。设备 Cookie 可以继续保留。

### 5.5 修改自己的昵称

`PATCH /api/auth/profile`：

```json
{"displayName":"新的中文昵称"}
```

必须有当前会话与设备 Cookie；trim 后 1–32，支持中文。成功 200 返回精简资料：

```json
{"player":{"subjectId":"0123456789abcdef0123456789abcdef","userId":"42","username":"player_01","displayName":"新的中文昵称"}}
```

明确拒绝额外字段，包括 userId、subjectId、username、role、avatar、avatarSkinId 和权限。当前会话确定被修改者，不接受前端选用户。成功后只合并相应展示字段，或重新查询会话；不要用精简响应覆盖整个 player 而丢失其他状态。

中文组合输入期间不要 trim、重建输入节点或截断字符，提交或 compositionend 后再校验。

### 5.6 修改自己的密码

`POST /api/auth/password`：

```json
{"currentPassword":"example-old-password","newPassword":"example-new-password"}
```

成功 200：

```json
{"changed":true,"reloginRequired":true}
```

- 原密码必须提供，长度 1–128；新密码 10–128，不能与原密码相同。
- 页面提供原密码、新密码、确认新密码；确认字段只做本地比较。
- 正文额外字段直接拒绝，不混入 source、returnUrl、confirmPassword。
- 原密码错误为 400 CURRENT_PASSWORD_INVALID，保留表单与当前会话，不假装成功。
- 会话失效为 401 AUTH_REQUIRED，清空敏感输入，立即回登录表单并提示。
- 成功后密码修改、全部会话撤销和通知在事务中完成，并清除当前登录 Cookie；必须重新登录。
- 成功后显示“密码已修改，请使用新密码重新登录”，不使用失效会话继续访问，不自动用旧密码登录。
- 不提供免原密码重置；忘记密码联系服主。

## 6. Cookie、同主机与不同子域

### 6.1 两个 Cookie 都不能遗漏

| 名称 | 用途 | 当前属性 |
| --- | --- | --- |
| `box_local_player_session` | 不透明随机会话值 | HttpOnly、SameSite=Lax、Path=/；登录时 Max-Age 通常 14 天 |
| `box_local_player_device` | 设备绑定与设备封禁 | HttpOnly、SameSite=Lax、Path=/；新建时 Max-Age 通常 365 天 |

Secure 和 Domain 按 Player Service 配置决定，退出和改密通过 Max-Age=0 清除会话。

必须做到：

- 浏览器 JS 不读取、不保存 token，不把密码或 token 放进 localStorage/URL。
- 不删除 HttpOnly、Secure、SameSite 来“修复”登录。
- 所有请求保留两个 Cookie；缺少设备 Cookie 可能导致会话因设备不匹配而撤销。
- 登录、注册、会话、退出、改密和错误响应的 Set-Cookie 均按上游返回处理。
- 多条 Set-Cookie 不用逗号合并、不用逗号拆分，Expires 内可能自带逗号。
- 不自行续期。数据库约 14 天闲置期限、30 天绝对上限；浏览器 Cookie 寿命不一定同步数据库续期，以上游返回为准。

Node.js 22 服务端转发：

```js
const cookies = upstream.headers.getSetCookie()
if (cookies.length) response.setHeader('Set-Cookie', cookies)
const retryAfter = upstream.headers.get('retry-after')
if (retryAfter) response.setHeader('Retry-After', retryAfter)
```

getSetCookie 用于服务端，浏览器不能用它读取登录 Cookie。更换 HTTP 库时确认能保留多条 Set-Cookie。Node fetch 不自动维护浏览器 Cookie jar，每次从当前请求转发。

### 6.2 相同主机、不同端口

`127.0.0.1:3125` 登录后访问 `127.0.0.1:3121` 可共享 Cookie，因为 Cookie 不按端口隔离；但两者 Origin 不同，来源配置仍需区分。

localhost 与 127.0.0.1 是不同 Cookie 主机，不能混用。IP 部署通常不配置 BOX_PLAYER_COOKIE_DOMAIN。

### 6.3 auth / play / edit 三个子域

例如 `https://auth.example.com`、`https://play.example.com`、`https://edit.example.com`，Player Service 需配置共同父域和允许来源：

```dotenv
BOX_PLAYER_COOKIE_DOMAIN=.example.com
BOX_PLAYER_AUTH_ALLOWED_ORIGINS=https://auth.example.com,https://play.example.com,https://edit.example.com
BOX_PLAYER_LOGIN_URL=https://auth.example.com/
```

这是引擎/Player Service 配置，不是前端构建变量，不会仅因换门户镜像就自动设置。

- 不设置 Domain 时 Cookie 默认只属于 auth.example.com，play/edit 收不到。
- Domain 是合法父域，不带协议、端口或路径，不能是公共后缀。
- 父域共享扩大信任范围，只放受控服务。修改 Domain 后旧 host-only 同名 Cookie 可能仍存在，用干净浏览器验证。
- HTTPS 外部部署应确保 Secure。底层判断依赖 BOX_SERVER_PUBLIC_URL 的 HTTPS 配置，或可信代理模式的转发协议；仅门户地址为 HTTPS 不保证底层自动设置 Secure。
- `auth.other.net` 与 `play.example.com` 不同注册域，不能靠 .example.com Cookie 或 credentials include 共享。当前没有跨站授权码交换/SSO 协议，应同父域部署或另行设计正式协议。

## 7. 来源校验、代理头与安全回跳

### 7.1 CSRF 与可信代理

完全自建门户必须服务端校验写请求来源；允许的浏览器 Origin 是用户实际访问门户的协议、主机、端口，不是 returnUrl，也不是内部 Docker 域名。

- 同源 JSON 请求，拒绝跨源 POST/PATCH；CORS 不是完整 CSRF 防护，不设置通配允许来源。
- 默认门户在 Origin 存在时检查它与当前请求地址一致，无 Origin 的工具请求仍可处理。
- 自建服务如允许无 Origin 写请求，须明确非浏览器用途，配合可信 Host、请求类型和 CSRF 策略，不把“没有 Origin”当成绝对安全。
- 代理后 socket 常为 HTTP，HTTPS 终结代理要设置正确 Host 和 X-Forwarded-Proto。
- 只在不能绕过可信代理直连服务时启用 trustProxy。
- 代理删除或覆盖外部伪造的 Forwarded 相关头，写入可信值；不让用户伪造 IP 绕过限流/封禁。
- 公网配置可信 Host 与 TLS，不直接把未经校验的 Host 当白名单。

### 7.2 source / returnUrl

入口可能为：

```text
https://auth.example.com/?source=play&returnUrl=https%3A%2F%2Fplay.example.com%2Fp%2Fmap-id
```

source 只识别 play 或 creator，选择对应配置的基准 URL；returnUrl 可为绝对地址或相对路径，但解析后的 Origin 必须与对应端相同。

默认规则：无合法 source 或对应配置时不回跳；无 returnUrl 时回基准地址；非法、跨 Origin 或无法解析时回退基准地址。

```js
function trustedReturnUrl(source, requested, config) {
  const value = source === 'play' ? config.playUrl : source === 'creator' ? config.creatorUrl : null
  if (!value) return null
  const base = new URL(value)
  try {
    const candidate = new URL(requested || '', base)
    return candidate.origin === base.origin ? candidate.href : base.href
  } catch {
    return base.href
  }
}
```

- 用 URL.origin 比较，不用 startsWith，防止 play.example.com.evil.test。
- 门户处理导航参数，不传到底层账号接口。
- 前端不直接 location.assign(query.returnUrl)，只使用后端校验后的结果，可再用同样白名单复核。
- 登录/注册成功可回跳；改密成功回登录页，不拿旧会话继续访问。
- 直接访问门户无 source 时显示账号操作，方便改昵称、改密、退出。
- 密码、Cookie、密钥、token 和内部身份断言绝不进入 query/hash。

## 8. 页面状态与请求代码

```text
初始化 → 查询会话
  ├─ player null → 登录（注册开关决定是否提供注册）
  ├─ player active → 账号 → 改昵称 / 改密 / 退出 / 继续访问
  └─ 封禁或服务异常 → 对应提示，不伪装成已登录
改密成功或自助 AUTH_REQUIRED → 登录表单 + 明确提示
```

交互要求：加载中只显示检查状态；提交禁用并防重复；支持 Enter、键盘焦点、明确 label、密码显示切换。用户名 autocomplete=username，原密码=current-password，新密码/确认=new-password。

登录/输入错误留在表单；会话失效立即回登录页；改密成功清空全部密码和 player 内存状态。中文组合输入不重建、不截断；显示昵称用文本插值/textContent，不用不可信 HTML。页面兼容字段缺失，昵称可回退 username，不增加头像占位功能。

### 8.1 浏览器封装示例

仅调用门户，不含密钥：

```js
async function portalApi(path, method = 'GET', body) {
  const controller = new AbortController()
  // 比默认门户 10 秒上游超时略长，让服务端先返回明确错误。
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data)) {
      const error = new Error(data?.message || `请求失败（HTTP ${response.status}）`)
      error.status = response.status
      error.code = data?.code
      error.retryAfter = response.headers.get('retry-after')
      throw error
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

// 独立操作示例，不是让页面顺序执行所有操作。
const querySession = (source = '', returnUrl = '') =>
  portalApi(`/api/auth/session?${new URLSearchParams({ source, returnUrl })}`)
const login = (username, password, source, returnUrl) =>
  portalApi('/api/auth/login', 'POST', { username, password, source, returnUrl })
const register = (username, displayName, password, source, returnUrl) =>
  portalApi('/api/auth/register', 'POST', { username, displayName, password, source, returnUrl })
const logout = () => portalApi('/api/auth/logout', 'POST', {})
const changeNickname = displayName => portalApi('/api/auth/profile', 'PATCH', { displayName })
const changePassword = (currentPassword, newPassword) =>
  portalApi('/api/auth/password', 'POST', { currentPassword, newPassword })
```

同源请求用 same-origin 即可；include 不能解决 Cookie 域、SameSite 或后端 CORS 配置问题。

### 8.2 @box/apis 客户端

能使用仓库 SDK 的工程优先使用生成客户端；独立门户也可以直接按本文 HTTP 契约实现，不必携带整套引擎源码。

```js
import { ApiClient } from '@box/apis'
const client = new ApiClient({ baseUrl: location.origin, credentials: 'include' })
// 每行一个独立操作。
const querySession = () => client.getApiAuthSession()
const login = (username, password) => client.postApiAuthLogin({ body: { username, password } })
const register = (username, displayName, password) => client.postApiAuthRegister({ body: { username, displayName, password } })
const logout = () => client.postApiAuthLogout({ body: {} })
const changeNickname = displayName => client.patchApiAuthProfile({ body: { displayName } })
const changePassword = (currentPassword, newPassword) => client.postApiAuthPassword({ body: { currentPassword, newPassword } })
```

普通方法成功返回 data，失败抛 ApiClientError，可读 error.response.status、error.details；需要状态、Retry-After 或 Set-Cookie 用对应 Raw 方法。

服务端对应方法为 postApiPlayerAuthLoginRaw、postApiPlayerAuthRegisterRaw、getApiPlayerAuthSessionRaw、postApiPlayerAuthLogoutRaw、patchApiPlayerAuthProfileRaw、postApiPlayerAuthPasswordRaw。baseUrl 改为内部地址，每次显式注入密钥和当前 Cookie。Raw 返回 `{data, error, response}`，失败不能只读取 data。浏览器代码不能使用这些带服务密钥的调用。

## 9. 完全自建后端的实现规范

以下不是可省略的优化：

1. 配置校验，不完整或不合法时拒绝启动。
2. 固定映射六个路径和方法，不提供“任意 URL/路径转发”，防 SSRF 和内部管理越权。
3. 限制正文大小、JSON 对象类型、Content-Type。
4. 校验写请求来源、可信 Host/CSRF；注册关闭时提前拒绝。
5. 正文按字段白名单提取，不自动转发整个浏览器对象/头/query。
6. 处理导航参数，昵称/改密额外字段直接拒绝。
7. 服务端 Key、Cookie、可信 IP/外部协议转发。
8. 上游超时和 redirect manual，不偷偷跟随重定向到其他主机。
9. 保留 HTTP 状态、多条 Set-Cookie、Retry-After，账号响应 no-store。
10. 仅登录/注册/会话增加安全回跳地址，不改造底层身份字段。
11. 连接、超时、非 JSON 异常映射为安全错误，不泄露堆栈或配置。
12. 添加门户级注册与必要速率限制，不绕过底层登录/自助限流。

核心转发片段：调用前已经完成上述路由、来源和正文校验。

```js
async function forwardValidatedOperation(request, response, config, operation, upstreamBody) {
  const methods = new Map([
    ['login', 'POST'], ['register', 'POST'], ['session', 'GET'],
    ['logout', 'POST'], ['profile', 'PATCH'], ['password', 'POST'],
  ])
  const method = methods.get(operation)
  if (!method || request.method !== method) throw new Error('Invalid operation')
  const headers = {
    Accept: 'application/json', 'X-Box-Player-Auth-Key': config.apiKey,
    Cookie: String(request.headers.cookie || ''),
    'User-Agent': String(request.headers['user-agent'] || '').slice(0, 512),
  }
  if (upstreamBody !== undefined) headers['Content-Type'] = 'application/json'
  // 生产实现还须补充可信客户端 IP / 外部协议，不能照抄未验证的代理头。
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const upstream = await fetch(new URL(`/api/player-auth/${operation}`, config.serviceUrl), {
      method, headers, redirect: 'manual', signal: controller.signal,
      body: upstreamBody === undefined ? undefined : JSON.stringify(upstreamBody),
    })
    const data = await upstream.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid upstream JSON')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    const cookies = upstream.headers.getSetCookie()
    if (cookies.length) response.setHeader('Set-Cookie', cookies)
    const retryAfter = upstream.headers.get('retry-after')
    if (retryAfter) response.setHeader('Retry-After', retryAfter)
    response.statusCode = upstream.status
    response.end(JSON.stringify(data))
  } finally {
    clearTimeout(timeout)
  }
}
```

这不是完整可上线服务器：调用者仍需实现来源/Host 校验、注册开关、白名单、可信转发头、导航、静态文件服务和异常映射。外层将上游解析失败映射为 502，不将片段异常原样暴露。

### 9.1 错误与限流

历史接口可能只有 message，新接口可能有 code。统一显示 message，按 HTTP 状态和可选 code 分类，不能忽略没有 code 的错误。

| 状态 / code | 含义与处理 |
| --- | --- |
| 400 / INVALID_INPUT | 字段、重名或业务条件无效，留表单显示 message |
| 400 CURRENT_PASSWORD_INVALID | 原密码错，不退出有效会话 |
| 登录 401，无 code | 常见为凭据错，留登录表单 |
| 自助 401 AUTH_REQUIRED | 过期或设备不匹配，立即回登录页 |
| 401 AUTH_API_KEY_INVALID | 门户配置异常，不误报玩家密码错，不无限回跳 |
| 403 REGISTRATION_DISABLED | 门户禁注册，隐藏入口 |
| 403 AUTH_ORIGIN_NOT_ALLOWED | 底层来源配置不匹配，不改成通配符 |
| 403 ORIGIN_NOT_ALLOWED | 默认门户拒绝跨源写，检查实际 Host/协议/代理 |
| 403，可能带 banReason/bannedUntil | 账号/IP/设备封禁，显示说明，不绕过 |
| 404 | 错服务、错路径或旧镜像，核对端口与接口 |
| 405 | 方法不支持，对照总表 |
| 413 BODY_TOO_LARGE / 415 UNSUPPORTED_MEDIA_TYPE | 默认门户正文过大或不是 JSON |
| 429，可能有 RATE_LIMITED | 暂停提交，保留并尊重 Retry-After，不循环重试 |
| 502 PLAYER_SERVICE_TIMEOUT | 默认门户上游超时，不当成密码错 |
| 502 PLAYER_SERVICE_UNAVAILABLE | 默认门户连接失败，查容器网络/服务状态 |
| 503 AUTH_API_KEY_NOT_CONFIGURED | 底层 Key 缺失/过短，服主修复 |
| 503 ACCOUNT_SERVICE_UNAVAILABLE 或旧接口 503 | 身份/数据库不可用，提示服务异常 |
| 其他 5xx、非 JSON | 安全失败提示，不泄露内部信息 |

当前自助限流：昵称每账号 20 次/5 分钟、每 IP 100 次/5 分钟；改密每账号 5 次/15 分钟、每 IP 30 次/15 分钟。进入限流阶段的失败改密也计入额度。

登录默认 10 次失败尝试/5 分钟，由 BOX_LOGIN_RATE_LIMIT_MAX_ATTEMPTS、BOX_LOGIN_RATE_LIMIT_WINDOW_MS 调整；按 IP、账号、IP+账号组合统计，成功会调整相关计数。

POST 超时不证明服务端未执行。尤其改密可能已提交但响应丢失，不自动重试，应查询会话、尝试新密码登录，必要时联系服主。

## 10. 制作 Docker 镜像

### 10.1 方式 A：继承默认镜像

```text
my-login/
  Dockerfile
  public/
    index.html
    app.js
    styles.css
    theme.js
```

Dockerfile：

```dockerfile
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
COPY --chown=node:node public/ /app/public/
```

继承默认后端、非 root 用户、端口、健康检查、许可证流程和代理。不要覆盖 ENTRYPOINT/CMD 绕过已有启动流程。

当前模板默认入口为 `/`，并从 `public/` 安全提供 JS、CSS、图片与字体资源。旧镜像可能只提供 `/`、`/app.js`、`/styles.css`、`/theme.js` 四个路径：

- 当前模板允许 public 下的 js/css/png/jpg/jpeg/webp/gif/svg/ico/woff/woff2；可以直接添加 logo、字体等资源。隐藏文件、其他扩展名、目录遍历和越界符号链接被拒绝。若继承旧镜像，请使用平铺产物或先升级基础镜像。
- /account、/login 等 HTML history 路由不会回退 index.html，使用页面状态/hash 路由，或自行实现路由。
- 默认 CSP 只允许同源脚本和样式，禁止内联脚本/样式，不依赖第三方 CDN。
- 当前默认 CSP 允许同源/data URL 图片和字体，默认不加载第三方 CDN。资源必须放在 public；不提供任意文件下载或上传接口。
- theme.js 可保留或替换，删除资源要同步改 HTML 引用。
- 更新 JS/CSS 时更新 HTML 资源版本 query，避免旧缓存；默认 HTML no-store、静态资源缓存 300 秒并重新校验。

Apple Silicon 本机示例：

```sh
docker image inspect box-local-engine-player-auth-portal:v0.2.0-linux-arm64
docker build --platform linux/arm64 --pull=false \
  --build-arg BASE_IMAGE=box-local-engine-player-auth-portal:v0.2.0-linux-arm64 \
  -t my-login:1.0 .
```

基础镜像须已存在，标签以实际安装为准，可能是 :0.2.0；AMD64 改为对应平台/已安装标签。继承旧镜像也继承旧后端，新前端需要改密时，门户基础镜像和 Player Service 都要含新接口。

### 10.2 方式 B：完全自建服务约束

| 项目 | 必需条件 |
| --- | --- |
| 平台 | 与启动器匹配，linux/amd64 或 linux/arm64 |
| 监听 | 0.0.0.0:3214，支持 HOST/PORT，不只监听容器 loopback |
| 健康接口 | GET /api/health-check，HTTP 200，可返回 status ok 与 service player-auth-portal |
| Docker HEALTHCHECK | 镜像中有效 CMD/CMD-SHELL 检查，只有 HTTP 接口不够 |
| 文件系统 | 根目录只读，仅 /tmp 等明确 tmpfs 可写，日志 stdout/stderr |
| 用户/资源 | 非 root，尊重内存、CPU、进程上限，轻量实现 |
| 启动 | 运行已构建产物，不启动时联网 npm install 或跑开发服务器 |
| 状态 | 不在门户复制账号或维护自己的 BOX3 token 表 |
| 凭据 | 只运行时读取，不 COPY .env/私钥/真实秘密 |

健康检查反映门户进程可服务，不因未登录、注册关闭、上游暂不可用而失败；上游故障由账号接口报告，避免重启循环。

如镜像有 Node 与 fetch，可用：

```dockerfile
EXPOSE 3214
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3214/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
```

检查框架临时目录、缓存与日志默认路径，应用目录写文件在只读容器会失败。HEALTHCHECK 端口须与监听一致。继承官方镜像时保留许可证资源、挂载和启动守卫，本文不提供绕过引擎许可或内部身份校验的方法。

## 11. 导入、选择和恢复

启动器只读本机 Docker 镜像，不自动拉取。

```sh
# 制作机器
docker save -o my-login-1.0.tar my-login:1.0
# 引擎运行机器
docker load -i my-login-1.0.tar
docker image inspect my-login:1.0 --format '{{.Os}}/{{.Architecture}}'
```

打开 **数据配置 → 访问设置 → 登录页面镜像** 独立卡片：

1. 默认显示当前引擎的官方登录镜像；“镜像名称与版本”可以改填 `my-login:1.0`，不是网页 URL。
2. 保存，运行中的登录服务会应用新镜像并等待健康；未运行时下次启动使用。
3. 缺失镜像、架构不符、无 HEALTHCHECK 或启动失败会报错，配置仍保留，修正再启动。
4. 恢复默认后保存，或清空字段，回默认镜像。

保存字段 BOX_AUTH_PORTAL_IMAGE，引擎升级会保留。每次页面发布用新 tag，如 my-login:1.1，避免同 tag 内容替换难追踪。

默认官方镜像跟随引擎版本；自定义镜像保留完整名称和版本，例如 my-login:1.0，更新引擎不会替换、升级或从仓库拉取它。本机自定义镜像缺失时明确报错，不静默回退到官方页面。只有主动修改配置或点击恢复默认后保存，才会改变这个选择。

手工 Compose 使用 --no-build，防止默认源码被构建到自定义镜像名；默认登录服务 pull_policy 为 never。仅换镜像不会替你配置 DNS、HTTPS、Cookie 父域、来源白名单或玩家权限。

## 12. 联调与验收

### 12.1 浏览器检查顺序

先验证本机同主机不同端口，再上公网：

1. session 为 200，返回 player/null。
2. 登录 200，注册 201，保存两个 HttpOnly Cookie。
3. 再查 session，请求携带两个 Cookie，返回同玩家。
4. Play/Creator 能收到会话；创作无权限时保持正确拒绝。
5. 改昵称、改密、退出分别验证，改密后旧会话不可用。
6. Console、bundle、Local Storage、URL 不出现真实服务密钥或明文密码。

### 12.2 curl 示例，只用专用测试账号

不要在共享终端、CI 日志或历史中粘贴真实密码。Cookie jar 也是敏感凭据，测试完删除，不提交或转发。

```sh
# 初始会话/设备 Cookie
curl -i -c /tmp/box-login-test.cookies http://127.0.0.1:3125/api/auth/session
# 登录
curl -i -b /tmp/box-login-test.cookies -c /tmp/box-login-test.cookies \
  -H 'Origin: http://127.0.0.1:3125' -H 'Content-Type: application/json' \
  --data '{"username":"player_01","password":"example-password-123"}' \
  http://127.0.0.1:3125/api/auth/login
# 昵称
curl -i -b /tmp/box-login-test.cookies -c /tmp/box-login-test.cookies \
  -X PATCH -H 'Origin: http://127.0.0.1:3125' -H 'Content-Type: application/json' \
  --data '{"displayName":"新的中文昵称"}' http://127.0.0.1:3125/api/auth/profile
# 改密：撤销测试账号全部会话
curl -i -b /tmp/box-login-test.cookies -c /tmp/box-login-test.cookies \
  -H 'Origin: http://127.0.0.1:3125' -H 'Content-Type: application/json' \
  --data '{"currentPassword":"example-password-123","newPassword":"example-new-password-456"}' \
  http://127.0.0.1:3125/api/auth/password
# 改密后应为 player null
curl -i -b /tmp/box-login-test.cookies http://127.0.0.1:3125/api/auth/session
```

直接调底层还需安全注入 X-Box-Player-Auth-Key；一般优先门户联调，避免密钥进 shell 历史。

### 12.3 验收表

| 测试 | 预期 |
| --- | --- |
| 空输入、非法用户名、长度超限 | 页面提示，绕过前端仍被底层拒绝 |
| 中文组合输入 | 不截断、不失焦 |
| 正确/错误登录 | 成功或留表单，服务失败不误报密码错 |
| 注册关闭 | 无入口，手工请求也不能创建账号 |
| 多条 Set-Cookie | 会话与设备都保存，无逗号合并 |
| 缺少设备 Cookie | 不能冒用会话，引导重新登录 |
| 另一设备登录 | 旧会话失效 |
| 错原密码、相同新密码、确认不一致 | 不改密、不错误清除有效会话 |
| 改密成功 | 全会话失效，清空输入，新密码可登录 |
| 过期时改昵称/密码 | 立即回登录并提示 |
| 重复点击/429 | 不重复提交，尊重 Retry-After |
| 跨源、伪造代理头 | 不绕过来源、限流、封禁 |
| 恶意 returnUrl/javascript/协议相对 URL | 不去未允许 Origin |
| HTTP 本机、HTTPS 公网、多个子域 | 正确 Cookie 属性，不混用主机名，目标端收到会话 |
| 上游停机/超时/返回 HTML | 安全服务错误，不自动重试写请求 |
| 只读/非 root 容器 | 启动正常，健康通过 |
| 不存在/错误平台镜像 | 启动器报错，不自动拉取 |
| 打包静态路径/CSP | 所有资源可访问，不因 CDN/内联依赖白屏 |

## 13. 常见问题定位

| 现象 | 优先检查 |
| --- | --- |
| 门户登录成功，Play/Creator 未登录 | Domain、Secure、设备 Cookie、主机混用、目标端 Cookie 转发 |
| AUTH_API_KEY_INVALID | 两端 Key、默认后端 AUTH_DEMO_API_KEY |
| 改密 404 | 两个镜像是否含接口、服务端口/路径、镜像精简规则 |
| 上游超时 | 容器误用 127.0.0.1、Docker 网络、上游/数据库就绪 |
| HTTPS 后来源拒绝 | Host、X-Forwarded-Proto、可信代理开关 |
| 会话频繁 null | 设备绑定、其他设备登录、撤销、Cookie 到期 |
| 镜像更新仍旧页面 | tag、容器是否重建、资源版本/缓存 |
| 健康失败 | HEALTHCHECK、监听、只读路径、用户权限、运行依赖 |
| /assets 404 | 确认文件位于 public、扩展名被允许，及基础镜像是否仍为只支持四个路径的旧版本 |

## 14. 可直接交给其他 AI 的任务说明

将本文和以下要求一起提供，无需提供真实密钥、密码、Cookie 或许可证：

> 请按这份 BOX3 自定义登录门户开发须知实现项目。优先继承默认门户镜像、只替换静态前端；如需完全自建后端，明确说明并实现六个代理接口和安全边界。只使用现有 Player Service 账号体系，不复制数据库，不做头像或无原密码重置，不暴露服主/内部管理凭据。实现会话初始化、注册开关、登录、退出、昵称修改、密码修改、安全回跳、限流和失效提示。支持中文和窄屏、防重复提交。密钥只保存在运行时后端，完整转发登录与设备 Cookie、多条 Set-Cookie、Retry-After。交付源码、构建说明、适配平台的镜像、健康检查、无真实凭据配置示例与验收测试。说明采用 A 还是 B、服主需要配置哪些域名/Cookie/Origin、哪些需求不是当前接口支持的能力。

建议目录：

```text
my-login/
  README.md           # 构建、导入、配置和测试
  Dockerfile
  .dockerignore       # 排除 .env、凭据、开发缓存
  .env.example        # 只有占位值
  src/
    pages/            # 登录、注册、账号、改密
    components/       # 输入、提示、按钮
    api/              # 浏览器同源请求封装
  public/             # A 的平铺静态产物
  server/             # 仅 B：配置、固定代理、来源校验、导航、静态服务
  tests/              # UI、安全与失败路径
```

以上已覆盖独立实现所需契约，以下只用于有仓库时进一步核对，不是阅读前置条件：

- 默认门户：apps/player-auth-portal/server.js、server/、src/app.jsx 与 src/pages/。
- 模板：apps/player-auth-portal/examples/custom-image/Dockerfile。
- 底层路由：apps/game/pages/api/player-auth/。
- 鉴权/账号：apps/game/server/player-auth-security.ts、local-player-identity.ts、player-self-service-handler.ts、player-self-password.ts。
- OpenAPI/SDK：internals/apis/openapi/openapi.json、internals/apis/src/generated/client.ts。
- 镜像接口保留：apps/local-engine/src/prune-player-build.js。
- 容器配置：根目录 docker-compose.yml。

接口变动应同步核对文档、OpenAPI、门户代理、页面和镜像保留规则，不能只改页面就认为新接口已进入发布镜像。
