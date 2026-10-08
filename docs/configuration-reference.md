# 配置参考

桌面启动器和 Linux Web 管理端都负责保存 `.env`，并在保存配置或启动服务时生成内部 `.runtime.env`。`.env` 是持久配置来源，`.runtime.env` 是可覆盖的派生文件，不应手工编辑。源码开发环境可以直接使用 `.env`；修改配置后重启受影响服务。

`BOX_BUILD_VERSION`、`BOX_BUILD_COMMIT`、`BOX_BUILD_DATE` 和 `BOX_BUILD_SOURCE` 是发行构建元数据，由构建流程写入镜像。它们不在启动器表单展示，也不应由服主手工配置。

## 最小配置

桌面启动器默认写入 `BOX_DATABASE_MODE=managed`，自动生成数据库密码并连接 Compose 内部的 `managed-postgres:5432`。选择外部数据库时写入 `BOX_DATABASE_MODE=external` 和拆分连接字段。下面的 `BOX_DATABASE_URL` 主要用于源码、Compose 或 Linux Web 部署：

```env
PERMISSION_TOKEN_SECRET=CHANGE_ME_PERMISSION_TOKEN_SECRET
BOX_PLAYER_AUTH_API_KEY=CHANGE_ME_BOX_PLAYER_AUTH_API_KEY
BOX_PLAY_ADMIN_TOKEN=CHANGE_ME_BOX_PLAY_ADMIN_TOKEN
BOX_DATABASE_URL=postgresql://USER:CHANGE_ME_DATABASE_PASSWORD@HOST:5432/DATABASE
```

## 常用变量

| 类别     | 变量                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 网络     | `BOX_BIND_IP`、`BOX_CREATOR_BIND_IP`、`BOX_VOXA_BIND_IP`、五个服务端口与对应 `*_PUBLIC_URL`                                                     |
| Play     | `BOX_PLAY_LIBRARY_DIR`、`BOX_PLAY_MAX_RUNTIMES`、`BOX_RUNTIME_IDLE_TIMEOUT_MS`、`BOX_LOCAL_PLAYER_LIMIT`                                        |
| 容器资源 | `BOX_PLAY_CPU_LIMIT`、`BOX_PLAY_MEMORY_LIMIT`、`BOX_PLAYER_SERVICE_CPU_LIMIT`、`BOX_PLAYER_SERVICE_MEMORY_LIMIT`                                |
| Teleport | `BOX_TELEPORT_MAX_ROOMS`、`BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS`                                                                                   |
| 数据     | `BOX_DATABASE_MODE`、`BOX_REDIS_MODE`、`BOX_DATABASE_URL`、`BOX_DATABASE_SSL`、`REDIS_HOST`、`REDIS_PORT`、`REDIS_DB`、`STORAGE_CACHE_REDIS_DB` |
| 登录     | `BOX_PLAYER_LOGIN_URL`、`BOX_PLAYER_AUTH_ALLOWED_ORIGINS`、`BOX_PLAYER_REGISTRATION_ENABLED`、`BOX_PLAYER_COOKIE_DOMAIN`                        |

`BOX_PLAY_LIBRARY_DIR` 是固定的地图数据目录，和 `BOX_PLAY_PORT` 无关。桌面启动器用 `BOX_PLAY_NETWORK_MODE`、`BOX_CREATOR_NETWORK_MODE` 和 `BOX_CREATOR_HOST` 记录界面选择，再生成实际绑定地址和公开 URL；源码/Compose 部署应直接配置 `BOX_BIND_IP`、`BOX_CREATOR_BIND_IP`、`BOX_VOXA_BIND_IP` 与各服务 `*_PUBLIC_URL`。VOXA 跟随 Creator 的访问范围。

## 网络与公开地址

默认宿主机端口为 Play `3121`、VOXA `3123`、Creator `3127`、Player Service `3124`、登录门户 `3125`，Linux Web 管理端为 `3130`。Compose 内部端口与这些宿主机地址不同，部署者不应直接公开内部端口。同一台主机上的宿主机端口不能重复。本机模式绑定 `127.0.0.1`；局域网模式使用检测到的私网地址；公网模式需要填写 IP 或域名，并同步更新公开 URL、登录门户 URL 和反向代理配置。

Creator 公网模式会同时开放 Creator 与 VOXA 的监听范围。该模式风险高，只应在 HTTPS、严格防火墙或 VPN、可信创作者账号及最小权限均已配置时使用。Play 公网地址写入 `BOX_PLAY_PUBLIC_URL` 或对应启动器配置；Cookie 跨子域共享时才设置 `BOX_PLAYER_COOKIE_DOMAIN`。

## 容量与运行时

`BOX_PLAY_MAX_RUNTIMES` 限制同时运行的地图和 Teleport 房间总数；`BOX_PLAY_PREWARM_RUNTIMES` 与 `BOX_CREATOR_EDIT_PREWARM_RUNTIMES` 默认均为 `0`。提高后只预热主地图优先的指定数量，不会为了预热遍历整个地图仓库；`BOX_RUNTIME_IDLE_TIMEOUT_MS` 控制无连接地图的回收时间。低配机器保持 `0`，高配置服主可按实际负载提高，再观察启动器性能监控。

游玩地图由“后台管理 → 游玩管理 → 游玩地图”统一管理，不再在 Play 游戏内提供旧的服主管理入口。地图文件不会因端口或容器重启而丢失，但自定义目录必须在升级后继续挂载。

地图运行容器的默认 CPU 与内存来自启动器写入的 `BOX_PLAY_CPU_LIMIT`/`BOX_PLAY_MEMORY_LIMIT`（以及 Creator 对应运行配置）。后台“地图容器配置”可创建多个资源组并对地图组或单张地图应用；未选择资源组时运行于共享 Node，选择后才启动独立 Docker 容器。资源组包含 CPU 毫核（`1000 m = 1 核`）、内存 MB、进程数、网络策略及可选出网带宽上限。CPU、内存与进程数由 Docker 强制限制；“仅内网”禁止公网出站但保留 Docker 私有服务访问；带宽限制仅作用于出网流量。

## 修改后的动作

| 修改内容                       | 需要重启                       |
| ------------------------------ | ------------------------------ |
| 端口、公开 URL、Cookie、Origin | Play、Player Service、登录门户 |
| PostgreSQL、Redis、密钥        | 所有依赖该配置的服务           |
| Play 容量、Teleport、地图库    | Play                           |
| 地图容器资源组、地图容量配置   | 仅新启动或重启的目标地图容器   |
| 注册开关                       | Player Service 与登录门户      |

启动器保存配置后会重新派生内部 URL；不要手工编辑 `.runtime.env`。源码部署可以编辑 `.env`，但改动后同样需要重新创建容器。

## PostgreSQL、Redis 与运行时缓存

`BOX_DATABASE_MODE` 供桌面启动器和 Linux Web 管理端使用，值为 `managed` 或 `external`。内置模式会启用 `desktop-postgres` Compose profile，数据库身份与连接参数由管理端自动维护，普通用户无需填写；数据库数据保存在 `box-managed-postgres-data`。Linux Web 包不携带 PostgreSQL 镜像，选择内置模式时会联网下载。

`BOX_MANAGED_POSTGRES_HOST_PORT` 控制桌面内置 PostgreSQL 映射到本机的端口，默认 `5432`，固定绑定 `127.0.0.1`。

`BOX_REDIS_MODE` 供桌面启动器和 Linux Web 管理端使用，值为 `disabled`、`managed` 或 `external`。内置模式启用 `desktop-redis` profile，固定使用 DB 0 保存一次性运行时会话和会话限流计数，DB 1 保存短期构建结果与并发构建锁，缓存有效期由 `STORAGE_CACHE_REDIS_TTL` 控制，默认 240 秒。管理页面只展示“业务 DB 0 / 缓存 DB 1”，不要求普通用户配置。内置 Redis 使用随机密码并将数据保存在 `box-managed-redis-data`；Linux Web 包不携带 Redis 镜像，选择内置模式时会联网下载。

`BOX_MANAGED_REDIS_HOST_PORT` 控制桌面内置 Redis 映射到本机的端口，默认 `6379`，固定绑定 `127.0.0.1`。

`BOX_RUNTIME_CACHE_PATH` 是 Play 的可再生成文件缓存路径。仓库 Compose 将它挂载到 `box-play-runtime-cache`，不是 PostgreSQL 的本地替代存储，也不应放入 Redis。源码或服务器部署通常不需要手工修改该路径。

`BOX_DATABASE_POOL_SIZE` 是每个业务服务或地图运行时的 PostgreSQL 最大连接数，Local Engine 的部署默认值为 `4`。多运行时同时运行时连接数会叠加；只有在 PostgreSQL 的 `max_connections`、内存和实际并发均已评估后才提高此值。

## 单服务公网地址与登录镜像

访问设置支持共用公网地址，以及 Play、Creator、VOXA、Player Service 和登录门户的单服务覆盖。单服务地址优先，留空使用共用地址；本机/局域网不使用公网覆盖，切回公网会保留已填草稿。
域名必须明确写 `http://` 或 `https://`，不因填写域名自动改成 HTTPS。IP 可不带协议，此时按 HTTP 与对应服务端口生成地址。是否使用代理由部署者决定。
主要覆盖字段为 `BOX_PLAY_PUBLIC_ADDRESS_OVERRIDE`、`BOX_CREATOR_PUBLIC_ADDRESS_OVERRIDE`、`BOX_VOXA_PUBLIC_ADDRESS_OVERRIDE`、`BOX_PLAYER_SERVICE_PUBLIC_ADDRESS_OVERRIDE` 和 `BOX_AUTH_PORTAL_PUBLIC_ADDRESS_OVERRIDE`；优先通过管理器保存，实际 URL 由运行时配置派生。

登录镜像使用 `BOX_AUTH_PORTAL_IMAGE`。默认官方镜像跟随引擎版本，自定义镜像名/版本保持服主设置；只读取本机已有 Docker 镜像，不为自定义配置自动拉取仓库镜像。制作与导入见[自建登录门户](./self-hosted-login.md)。
