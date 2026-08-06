# Box Local Engine 游玩端部署包

服主只需要 Docker，不需要项目源码、Node.js 或 pnpm。

将以下文件放在同一个目录：

```text
play-image.tar
compose.yml
.env.example
play-worlds/
```

首次部署：

```bash
cp .env.example .env
openssl rand -hex 32
```

把生成值填入 `.env` 的 `PERMISSION_TOKEN_SECRET`，然后执行：

```bash
docker image load --input play-image.tar
mkdir -p play-worlds
docker compose up -d
docker compose ps
```

默认只允许本机访问 `http://127.0.0.1:3000/`。直接通过服务器 IP 访问时，将
`BOX_PLAY_HOST_IP` 改为 `0.0.0.0` 并配置服务器防火墙。正式公网环境推荐使用 HTTPS
反向代理。

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
docker compose up -d
```

不要把 `.env`、管理员密钥、数据库密码或 `play-worlds` 玩家数据公开发送。
