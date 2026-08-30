# BOX3 Engine 配置参考

本文说明当前工程中配置从哪里读取、哪些变量由谁维护，以及部署时真正需要填写什么。它不是把 `.env.docker.example` 再复制一遍；完整模板仍以仓库根目录的 `.env.docker.example` 为准。

## 先理解两种部署路径

| 路径                  | 配置文件                                        | PostgreSQL                            | Redis              | 适用场景                             |
| --------------------- | ----------------------------------------------- | ------------------------------------- | ------------------ | ------------------------------------ |
| 图形化部署管理器      | 启动器应用数据目录中的 `.env` 与 `.runtime.env` | 必填，使用远程实例                    | 可选，使用远程实例 | Windows/macOS/Linux 桌面服主         |
| 源码 / Docker Compose | 仓库根目录 `.env`                               | Player Service 必需；地图脚本数据可选 | 可选               | 开发者、自管服务器、无图形界面 Linux |

桌面启动器不会安装或管理 PostgreSQL、Redis。它在“数据配置”中保存 PostgreSQL 主机、端口、数据库、账号和密码，并在每次启动服务前生成运行时连接串。

源码 Compose 可以通过 `pnpm infra` 启动仓库提供的 PostgreSQL/Redis 容器，也可以改用远程服务。没有 PostgreSQL 时，地图的纯本地工程流程可使用文件回退；但 Player Service 的账号、登录、权限、封禁和持久会话不能正常工作。因此面向真实玩家的部署应始终配置 PostgreSQL。

## 配置文件与优先级

### 图形化部署管理器

启动器把持久配置写到系统应用数据目录的 `runtime/.env`，把派生变量写到同目录 `runtime/.runtime.env`。

- `.env`：服主拥有的配置。可从“数据配置 → 原始 .env”查看或修改；保存后会校验格式和安全规则。
- `.runtime.env`：由启动器生成，含 Compose profiles、镜像标签、内部服务地址、公开 URL、CORS 与绑定地址。不要手工编辑，下一次启动会重新生成。
- 两个文件、项目、模型、备份与日志都不在 App/EXE 内；升级或替换安装器不会覆盖它们。

启动器会保守处理 Creator/VOXA：即使在原始 `.env` 中手工填写公网地址，也会在生成运行时配置时把 Creator/VOXA 限制到回环地址或私网地址。

### 源码 / Docker Compose

在仓库根目录复制模板：

```bash
cp .env.docker.example .env
```

Docker Compose 会读取 `.env`，容器内部的默认值由 `docker-compose.yml` 提供。修改后需要重新创建受影响服务，最直接的方法是：

```bash
docker compose --profile <profile> up -d --force-recreate <service>
```

只修改网页地址、端口、CORS 或密钥时无需重新构建镜像；修改源码、Dockerfile 或镜像标签才需要重新构建。

## 最小安全配置

至少为下面三个变量设置彼此不同的随机值。不要使用示例值，也不要写进浏览器代码、截图、Issue 或 Git。

```env
PERMISSION_TOKEN_SECRET=<openssl rand -hex 32 的输出>
BOX_PLAYER_AUTH_API_KEY=<openssl rand -hex 32 的输出>
BOX_PLAY_ADMIN_TOKEN=<openssl rand -hex 32 的输出>
```

生成示例：

```bash
openssl rand -hex 32
```

| 变量                      | 用途                                           | 轮换影响                                                      |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `PERMISSION_TOKEN_SECRET` | Creator/Play 运行时身份与稳定 `userKey` 的签名 | 已运行会话失效；脚本中依赖 `userKey` 的旧存档会变成新命名空间 |
| `BOX_PLAYER_AUTH_API_KEY` | 自建登录门户后端调用认证 API                   | 旧门户立即无法登录，需同步更新其服务端秘密配置                |
| `BOX_PLAY_ADMIN_TOKEN`    | 服主自动化或管理 API 的 Bearer token           | 使用旧 token 的后台任务立即失效                               |

## 网络与端口

默认端口如下；所有端口都可在桌面启动器中修改。源码 Compose 通过对应变量修改。

| 服务           |       默认端口 | 变量                      | 可公开 | 说明                                                 |
| -------------- | -------------: | ------------------------- | ------ | ---------------------------------------------------- |
| Play           |           3000 | `BOX_PLAY_PORT`           | 可以   | 玩家页面、地图资源和 WebSocket 同源使用此端口        |
| VOXA           |           3001 | `BOX_VOXA_PORT`           | 不可以 | 仅本机或可信局域网 Creator 使用                      |
| Creator        |           3002 | `BOX_CREATOR_PORT`        | 不可以 | 仅本机或可信局域网编辑使用                           |
| Player Service |           3213 | `BOX_PLAYER_SERVICE_PORT` | 可控   | 玩家后台与认证 API；公网建议经反向代理并限制管理入口 |
| 参考登录门户   |           3214 | `BOX_AUTH_PORTAL_PORT`    | 可以   | 仅为参考实现；服主可改为自建门户                     |
| 内部迁移工具   | 4120（宿主机） | `BOX_MIGRATOR_PORT`       | 否     | 仅仓库维护者使用，不进入用户发行包                   |

### 本机、局域网与公网

- **本机**：使用 `127.0.0.1`，只有当前电脑可访问。
- **局域网**：Play/Player Service/登录门户可监听 `0.0.0.0` 并使用本机私网 IP；Creator/VOXA 必须填写私网 IP 或保留回环地址。
- **公网**：只公开 Play、Player Service 和自建登录门户，建议全部由 HTTPS 反向代理提供。Creator/VOXA 不支持公网。

公网反向代理需要转发 WebSocket Upgrade，并且只有代理确实清洗了转发头时才能设置 `BOX_TRUST_PROXY=true`。否则任何客户端都可能伪造来源 IP 或协议头。

以下 URL 必须使用玩家实际访问到的地址，协议、主机名/IP 和端口都要一致：

```env
BOX_PLAY_PUBLIC_URL=https://play.example.com
BOX_PLAYER_SERVICE_PUBLIC_URL=https://player.example.com
BOX_PLAYER_LOGIN_URL=https://login.example.com/login
```

Creator/VOXA 局域网部署还需要同步配置 `BOX_CREATOR_PUBLIC_URL`、`BOX_VOXA_PUBLIC_URL`、`BOX_VOXA_ALLOWED_ORIGINS`、`BOX_RESOURCE_ALLOWED_ORIGINS`。图形化启动器会自动派生这些变量；手工 Compose 才需要自己维护。

## 内部迁移工具配置

本节只面向仓库维护者。`apps/migrator/` 不进入桌面离线包、无图形服务器包或普通服主的 Compose 流程，并且可能依赖迁移来源网络。普通部署者不需要配置以下变量。

内部迁移工具下载地图资源时，网络超时、连接中断、HTTP 408/425/429 或 5xx 会自动重试；HTTP 404 等明确不存在的资源不会重复请求。单个资源在重试耗尽后会记录为“已跳过”，不会卡住整个迁移任务。

可按网络情况调整（均为可选）：

| 变量                              |  默认值 | 说明                                          |
| --------------------------------- | ------: | --------------------------------------------- |
| `BOX_MIGRATOR_MAX_RETRIES`        |     `3` | 首次请求失败后的重试次数（默认最多 4 次请求） |
| `BOX_MIGRATOR_RETRY_DELAY_MS`     |  `1000` | 首次重试等待毫秒数，之后按 1s、2s、4s 递增    |
| `BOX_MIGRATOR_REQUEST_TIMEOUT_MS` | `15000` | 单次请求（含响应体读取）超时时间              |

## 数据服务

### PostgreSQL

源码 Compose 使用单一连接串：

```env
BOX_DATABASE_URL=postgresql://box_user:password@db.example.com:5432/box
BOX_DATABASE_SCHEMA=box_engine
BOX_IDENTITY_DATABASE_SCHEMA=box_identity
BOX_DATABASE_SSL=true
BOX_DATABASE_SSL_REJECT_UNAUTHORIZED=true
BOX_DATABASE_POOL_SIZE=10
```

两个 schema 职责不同：`box_identity` 保存账号、会话、封禁和审计；`box_engine` 保存地图脚本的持久数据。不要让两个环境共用同一个 schema，测试环境也不应连接生产数据库。

桌面启动器将连接串拆为 `BOX_DATABASE_HOST`、`BOX_DATABASE_PORT`、`BOX_DATABASE_NAME`、`BOX_DATABASE_USER`、`BOX_DATABASE_PASSWORD`，再写入生成的 `.runtime.env`。这是为了让服主不必手写和转义 URL。
连接池大小也可在“数据配置 → 数据服务”中调整；它是每个地图运行时的连接上限，不是整台服务器
共享的总连接数。

### Redis

Redis 可选。配置后用于跨实例 session/限流和构建缓存；不可用时服务回退到内存与本地文件缓存。

```env
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<可选密码>
REDIS_DB=0
STORAGE_CACHE_REDIS_DB=1
STORAGE_CACHE_REDIS_TTL=240
```

`REDIS_DB` 与 `STORAGE_CACHE_REDIS_DB` 应不同。Redis 不是地图脚本数据的正确性来源，不能替代 PostgreSQL 备份。

## 服务容量与运行时

| 变量                                          |  默认值 | 含义                                             |
| --------------------------------------------- | ------: | ------------------------------------------------ |
| `BOX_LOCAL_PLAYER_LIMIT`                      |       8 | 单个运行时允许的本地玩家数                       |
| `BOX_CREATOR_EDIT_MAX_RUNTIMES`               |       6 | Creator 同时保留的编辑运行时上限                 |
| `BOX_CREATOR_PLAY_MAX_RUNTIMES`               |       4 | Creator 预览运行时上限                           |
| `BOX_PLAY_MAX_RUNTIMES`                       |       8 | Play 运行时上限                                  |
| `BOX_CREATOR_EDIT_PREWARM_RUNTIMES`           |       6 | Creator 提前常驻的编辑运行时数量                 |
| `BOX_CREATOR_PLAY_PREWARM_RUNTIMES`           |       0 | Creator 提前常驻的预览运行时数量                 |
| `BOX_PLAY_PREWARM_RUNTIMES`                   |       8 | Play 提前常驻的游玩运行时数量                    |
| `BOX_RUNTIME_IDLE_TIMEOUT_MS`                 |  900000 | 无连接运行时的回收等待时间（15 分钟）            |
| `BOX_RUNTIME_START_TIMEOUT_MS`                | 1800000 | 大型地图首次预烘焙/启动的最大等待时间（30 分钟） |
| `BOX_TELEPORT_MAX_ROOMS`                      |      64 | 可保留的 Teleport 私有房间数量上限               |
| `BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS`           |  900000 | 无连接私有房间的回收等待时间（15 分钟）          |
| `BOX_SCRIPT_HEAP_MB` / `BOX_SCRIPT_MEMORY_MB` |     512 | 单运行时脚本内存限制（MiB）                      |

调整上限前先看 Docker Desktop 或服务器的实际 CPU、内存和地图尺寸。把上限调高不会让单张大地图更快，只会允许更多运行时同时争用资源。

桌面启动器的“数据配置 → 运行容量”可以直接维护玩家上限、运行时与预热数量、脚本内存、启动
超时、Teleport 房间策略和主要容器的 CPU/内存限制。界面中的时间统一使用分钟、容器内存统一
使用 MiB，保存时会转换为底层环境变量；高级部署仍可在 `.env` 中直接维护原始值。

### 容器资源限制

| 变量                                      | 默认值     | 含义                        |
| ----------------------------------------- | ---------- | --------------------------- |
| `BOX_PLAYER_SERVICE_MEMORY_LIMIT` / `CPU` | 1g / 1     | 玩家服务容器内存和 CPU 上限 |
| `BOX_AUTH_PORTAL_MEMORY_LIMIT` / `CPU`    | 128m / 0.5 | 登录门户容器内存和 CPU 上限 |
| `BOX_CREATOR_MEMORY_LIMIT` / `CPU`        | 6g / 4     | Creator 容器内存和 CPU 上限 |
| `BOX_PLAY_MEMORY_LIMIT` / `CPU`           | 4g / 4     | Play 容器内存和 CPU 上限    |

表中的 `/ CPU` 是对应的 `*_CPU_LIMIT` 变量。容器总内存必须为多个地图脚本运行时和服务本身
留出空间；不要把容器内存设置成与单运行时脚本内存相同。

## 地图、Play 与备份

| 变量                               | 默认值         | 含义                                                                   |
| ---------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `BOX_PLAY_LIBRARY_READ_ONLY`       | `true`         | Play 地图库是否只读；网页导入/删除 `.boxplay` 时必须为 `false`         |
| `BOX_PLAY_LIBRARY_DIR`             | 空             | 自定义宿主机 Play 地图库目录；留空使用 `apps/local-engine/play-worlds` |
| `BOX_AUTO_BACKUP_ENABLED`          | `false`        | 定时导出可编辑工程备份                                                 |
| `BOX_AUTO_BACKUP_INTERVAL_MINUTES` | 60             | 自动备份间隔，范围 1–10080 分钟                                        |
| `BOX_AUTO_BACKUP_RETENTION_COUNT`  | 24             | 每地图保留份数，范围 1–1000                                            |
| `BOX_AUTO_BACKUP_RETENTION_DAYS`   | 30             | 最长保留天数，范围 1–3650                                              |
| `BOX_PROJECT_BACKUP_PATH`          | 容器内备份目录 | Docker Creator 的备份目标；通常保持默认                                |

自动备份只包含可编辑地图工程及其资源，不包含 PostgreSQL、Redis、玩家账号或 Docker volume。需要完整灾备时还要单独备份 PostgreSQL。

## 登录与 Cookie

| 变量                              | 作用                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `BOX_PLAYER_LOGIN_URL`            | 服主登录页地址；留空时 Creator/Play 显示“未开启登录”                         |
| `BOX_PLAYER_AUTH_ALLOWED_ORIGINS` | 允许调用认证 API 的门户 Origin 列表，英文逗号分隔，不支持 `*`                |
| `BOX_PLAYER_COOKIE_DOMAIN`        | 多个 HTTPS 子域共享 Cookie 时设置共同父域，如 `.example.com`；本机/IP 不填写 |
| `BOX_PLAYER_REGISTRATION_ENABLED` | 是否允许玩家自行注册；不影响服主在后台创建账号                               |

桌面启动器在“数据配置 → 服主与安全”中提供“允许新玩家注册”和“允许网页管理地图包”两个
高层开关。后者关闭时会写入 `BOX_PLAY_LIBRARY_READ_ONLY=true`，首页仍可展示和启动已有地图，
但不再显示服主管理入口，也不能导入、覆盖、修改或删除地图包。

参考门户由 `player-auth-portal` 镜像提供，但不是强制产品接口。服主可以自己写门户；详情见[自建登录门户](./self-hosted-login.md)。

Player Service 会将会话绑定到首次登录的设备 Cookie：仅复制会话 Cookie 不能在另一台设备继续使用。普通玩家每次在新设备成功登录都会使上一台设备下线；服主和玩家管理后台管理员不受单设备限制。会话最长空闲 14 天，创建满 30 天后要求重新登录。公网部署必须使用 HTTPS；否则浏览器无法为会话 Cookie 启用 `Secure` 标记。

## URL、跨域与脚本不是同一个开关

- `BOX_PLAYER_AUTH_ALLOWED_ORIGINS`、`BOX_RESOURCE_ALLOWED_ORIGINS` 和 `BOX_VOXA_ALLOWED_ORIGINS` 控制哪些网页来源可以调用对应服务；它们用于隔离服务，不是地图脚本可访问域名的列表。
- 地图脚本通过引擎 URL 接口访问外部资源时，不再要求目标域名属于 BOX 平台白名单；目标必须是格式正确的绝对 HTTP(S) URL。
- `javascript:`、`data:`、`vbscript:`、`file:`、控制字符、URL 用户名/密码和缺少协议的地址仍会被拒绝。这项校验用于阻止协议注入，不能通过关闭 CORS 或修改 Origin 配置绕过。
- 浏览器自身仍会执行同源策略、目标服务器 CORS、混合内容和 CSP 等平台规则；引擎允许一个 URL 不代表浏览器或目标服务器一定允许请求。

## 修改配置后的动作

| 修改内容                                                                  | 是否重建镜像 | 是否重启服务                   |
| ------------------------------------------------------------------------- | ------------ | ------------------------------ |
| 端口、公开 URL、CORS、数据库、Redis、密钥、容量、备份                     | 否           | 是，重新创建受影响服务         |
| 项目、模型、地图、备份文件                                                | 否           | 通常否；依照网页提示或刷新列表 |
| `apps/game`、`services/game-server`、`apps/local-engine`、Dockerfile 源码 | 是           | 是                             |
| 桌面启动器前端/Rust 源码                                                  | 重建 App     | 不影响已运行 Docker 服务       |

用启动器修改配置时，只需点击“保存配置”，再回到“服务总览”选择需要启动的范围；保存不会自动启动服务。
