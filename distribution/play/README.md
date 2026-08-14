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

默认只允许本机访问 `http://127.0.0.1:3000/`。直接通过服务器 IP 访问时，将
`BOX_PLAY_HOST_IP` 改为 `0.0.0.0` 并配置服务器防火墙。正式公网环境推荐使用 HTTPS
反向代理。

两个镜像归档相互独立，更新玩家服务不需要重新分发游玩镜像。玩家中心默认是
`http://127.0.0.1:3213/`；需要远程访问时还要配置 `BOX_PLAYER_SERVICE_HOST_IP` 和
`BOX_PLAYER_SERVICE_PUBLIC_URL`。

登录、注册和玩家管理只在玩家服务中提供；Play 的 `3000` 端口不显示这些入口。

地图可以通过网页服主管理导入。先在 `.env` 设置：

```env
BOX_PLAY_ADMIN_TOKEN=至少16位随机管理密钥
BOX_PLAY_LIBRARY_READ_ONLY=false
```

然后执行 `docker compose up -d --force-recreate`，在首页进入“服主管理”并导入
`.boxplay`。也可以把完整发布目录放入 `play-worlds/<作品ID>/`。增加地图不需要重建镜像。

更新镜像：

```bash
docker compose down
docker image load --input play-image.tar
docker image load --input player-service-image.tar
docker compose up -d
```

不要把 `.env`、管理员密钥、数据库密码或 `play-worlds` 玩家数据公开发送。
