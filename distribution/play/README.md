# Box Local Engine 游玩端部署包

服主只需要 Docker，不需要项目源码、Node.js 或 pnpm。

将以下文件放在同一个目录：

```text
play-image.tar
player-service-image.tar
compose.yml
.env.example
play-worlds/
```

通过创作端正式导出的分发目录还会包含 `BUILD-INFO.json`、`LICENSE.txt`、
`THIRD-PARTY-NOTICES.json` 和 `SHA256SUMS`。收到这种目录后先校验完整性：Linux 执行
`sha256sum -c SHA256SUMS`，macOS 执行 `shasum -a 256 -c SHA256SUMS`。

首次部署：

```bash
cp .env.example .env
openssl rand -hex 32
```

把生成值填入 `.env` 的 `PERMISSION_TOKEN_SECRET`，并配置 PostgreSQL 的
`BOX_DATABASE_URL`，然后执行：

```bash
docker image load --input play-image.tar
docker image load --input player-service-image.tar
mkdir -p play-worlds
docker compose up -d
docker compose ps
```

`play-storage-init` 是保留的服务名，实际只初始化运行时缓存卷；显示 `Exited (0)` 是正常状态：它在启动前修复目录所有权，完成后
立即退出；Play 主容器仍以非 root 的 `node` 用户运行。只有该任务退出码非 `0` 时才需要检查
volume 权限。

默认只允许本机访问 `http://127.0.0.1:3121/`。直接通过服务器 IP 访问时，将
`BOX_PLAY_HOST_IP` 改为 `0.0.0.0` 并配置服务器防火墙。正式公网环境推荐使用 HTTPS
反向代理。

`BOX_DATABASE_URL` 和固定的 `PERMISSION_TOKEN_SECRET` 是分发部署的必填项；后者不能在
重启或升级时更换，否则现有会话和运行时身份会失效。公网只暴露 HTTPS 反向代理，Player
Service 管理页、PostgreSQL 和 Redis 不应直接暴露到互联网。

两个镜像归档相互独立，更新玩家服务不需要重新分发游玩镜像。玩家管理后台默认是
`http://127.0.0.1:3124/players`。玩家登录页由服主自行部署；配置
`BOX_PLAYER_LOGIN_URL` 后，未登录玩家会跳转到该地址，留空则显示“未开启登录”。认证接口仍必须配置
至少 16 位的 `BOX_PLAYER_AUTH_API_KEY`。Key 只能配置在服主登录
后端与 Player Service，不能放进浏览器；Origin 限制可通过 `BOX_PLAYER_AUTH_ALLOWED_ORIGINS` 配置。

登录、注册 API 和玩家管理只在玩家服务中提供；Player Service 和 Play 都不内置玩家登录页。

Play 会在后台依次为全部地图生成持久预烘焙缓存，并保存到 `box-play-runtime-cache` 卷。该卷只保存可再生成的运行时缓存，不保存玩家账号、权限或地图脚本持久数据。
使用 `BOX_PLAY_PREWARM_RUNTIMES` 调整缓存完成后继续常驻的地图数量，设为 `0` 可关闭；
该值不应超过 `BOX_PLAY_MAX_RUNTIMES`。运行时回收或容器重启不会再次完整烘焙未变化的地图。

地图组脚本支持 `world.teleport(mapId, players, serverId?)`。默认会创建不公开展示的独立
私有房间；只有被传送的登录玩家可以进入。`BOX_TELEPORT_MAX_ROOMS` 控制可保留的房间数量，
`BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS` 控制无人房间的回收时间，房间运行时仍计入
`BOX_PLAY_MAX_RUNTIMES`。

地图可以通过网页服主管理导入。先在 `.env` 设置：

```env
BOX_PLAY_ADMIN_TOKEN=至少16位随机管理密钥
```

然后执行 `docker compose up -d --force-recreate`，在玩家管理后台的“服主管理 → 游玩地图”中导入
`.boxplay`。也可以把完整发布目录放入 `play-worlds/<作品ID>/`。增加地图不需要重建镜像。

更新镜像：

```bash
docker compose down
docker image load --input play-image.tar
docker image load --input player-service-image.tar
docker compose up -d
```

不要把 `.env`、管理员密钥、数据库密码或 `play-worlds` 玩家数据公开发送。

地图包、镜像和工程目录备份不包含 PostgreSQL 数据。服主必须另外安排数据库快照或
`pg_dump`，并验证可以恢复玩家账号、审计记录和地图数据空间。
