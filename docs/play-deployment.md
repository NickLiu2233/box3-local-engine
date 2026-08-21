# 游玩端构建、分发与多地图部署手册

本文面向私服主、服务器运维人员和需要分发 Box Local Engine 游玩端的创作者。游玩端只托管
创作端已经发布的只读作品，不提供作品管理器、地图编辑器或可编辑工程导入能力。

普通玩家不需要 Docker、不需要地图文件，也不需要安装引擎，只需要打开服务器网址。

## 1. 游玩端包含什么

游玩端镜像名默认为：

```text
box-local-engine-play:0.1.0
```

游玩镜像包含：

- 玩家网页；
- 渲染和交互所需的浏览器代码；
- 权威游戏运行时；
- 本地基础资源；
- 多地图发现和按需启动能力。

游玩镜像不包含：

- 作品管理页面；
- 编辑页面和编辑运行时；
- Monaco 代码编辑器；
- 宿主机的可编辑 `source/` 工程；
- `.boxproject` 工程包；
- 本机 `.env`、证书、私钥、Source Map 和 TypeScript 源文件。

地图数据独立保存在宿主机，通过只读目录挂载到容器。构建完镜像后仍然可以继续添加地图，
不需要重新构建镜像。

## 2. 两种游玩部署方式

### 多地图部署

一个游玩容器读取 `play-worlds/` 下的多个地图：

```text
play-worlds/
  island/
  city/
```

## 服主管理界面

游玩端可以在作品首页直接导入、导出和删除地图，但默认关闭。先生成一段随机管理密钥：

```bash
openssl rand -hex 32
```

将结果写入仓库根目录的 `.env`：

```env
BOX_PLAY_ADMIN_TOKEN=这里填写生成的随机密钥
BOX_PLAY_LIBRARY_READ_ONLY=false
```

然后重新创建游玩容器，让环境变量和可写挂载生效：

```bash
pnpm play
```

打开作品首页，点击右上角“服主管理”，输入密钥后可以：

- 选择一个 `.boxplay` 地图组游玩包，一次导入主地图和全部副地图；
- 从任意成员把已安装的完整地图组导出为一个 `.boxplay`；
- 通过项目内确认弹窗删除地图。

密钥只保存在当前浏览器标签页的会话存储中。关闭标签页或点击“退出管理”后需要重新验证。
服务端会对每一次管理操作重新验证，连续验证失败还会触发临时限流。
玩家登录、注册和玩家管理不放在 Play 页面中。服主请直接打开独立玩家服务
`http://127.0.0.1:3213/players`，查看已注册账号、修改昵称/角色/状态、
强制下线或封禁玩家。

`.boxplay` 只包含发布后的游玩地图，不包含 `.boxproject` 可编辑工程、编辑器或引擎源码。
一个文件内保留主地图、副地图和地图组身份；每张地图仍有自己的 `/p/<地图ID>` 入口，运行时
共享同一个地图组数据空间。同 ID 地图不会自动覆盖：只要包内任意成员 ID 已存在，整包都会
拒绝，其他成员也不会被写入。更新地图组时应先导出备份，再删除旧成员并导入新版本。

不需要网页管理功能时保持以下默认配置，地图目录会继续以只读方式挂载：

```env
BOX_PLAY_ADMIN_TOKEN=
BOX_PLAY_LIBRARY_READ_ONLY=true
```

玩家分别访问：

```text
/p/island
/p/city
```

这是 `pnpm play` 使用的默认方式，适合长期运行的私服。

### 单作品部署包

创作者在作品管理器中导出某个版本的游玩部署包。包内使用固定 `world/` 目录，只运行一个
作品，适合“一份部署包对应一张地图”。

单作品部署包不是多地图库。需要同一服务器托管多个地图时，应使用本文的多地图方式。

## 3. 环境要求

从仓库构建需要：

- Docker Desktop 或 Docker Engine；
- Docker Compose v2；
- Node.js 20 或更高版本；
- pnpm 10.12.1。

只接收已构建镜像的私服主仅需要 Docker Engine/Desktop 和 Docker Compose v2。

确认环境：

```bash
docker version
docker compose version
```

## 4. 从仓库构建并启动游玩端

进入仓库根目录：

```bash
cd /path/to/local-engine
```

准备配置：

```bash
cp .env.docker.example .env
```

创建地图库目录：

```bash
mkdir -p apps/local-engine/play-worlds
```

构建或准备游玩镜像并启动：

```bash
pnpm play
```

该命令会：

1. 检查当前游玩镜像归档的标签、架构和格式；
2. 镜像不存在或格式过旧时，只构建 `box-local-engine-play`；
3. 只把游玩镜像保存到可分发的 `play-image.tar`；
4. 停止占用同一网页端口的创作端；
5. 启动或重建游玩端容器；
6. 将宿主机 `play-worlds/` 只读挂载到容器。

它不会构建创作端镜像。

默认入口：

```text
http://127.0.0.1:3000/
```

玩家账号与服主管理默认位于 `http://127.0.0.1:3213/`。Play 只在建立游戏会话时通过
内部接口读取同一份 PostgreSQL 玩家身份，不承载登录、注册或管理页面。

游玩端只公开一个端口。网页、地图资源、会话请求和 WebSocket 都从同一公开地址进入。

### 游玩端命令的区别

| 命令                                                  | 是否构建 Docker 镜像     | 是否启动容器             | 是否准备 `play-image.tar`           | 适用场景                             |
| ----------------------------------------------------- | ------------------------ | ------------------------ | ----------------------------------- | ------------------------------------ |
| `pnpm player-service`                                 | 是，只构建玩家服务       | 是                       | 独立生成 `player-service-image.tar` | 首次部署或玩家服务更新               |
| `pnpm play`                                           | 缺失或过旧时只构建游玩端 | 是                       | 是                                  | 推荐的正常部署方式                   |
| `docker compose --profile play build play`            | 是，只构建游玩端         | 否                       | 否                                  | 运维只想构建本机镜像                 |
| `docker compose --profile play up -d --no-build play` | 否                       | 是                       | 否                                  | 已准备好环境变量和地图挂载时直接启动 |
| `pnpm build:play`                                     | 否，生成本机源码生产产物 | 否                       | 否                                  | 引擎维护者调试                       |
| `pnpm start:play`                                     | 否                       | 否，直接运行本机生产产物 | 否                                  | 引擎维护者调试                       |

普通私服部署优先使用 `pnpm play`。它不仅处理镜像，还会校验目标架构、镜像格式和归档，并
按当前地图库路径重新创建容器。单独执行 `pnpm build:play` 不会生成 Docker 镜像。

## 5. 选择镜像架构

默认配置面向常见 x86_64/amd64 私服：

```env
BOX_PLAY_PLATFORM=linux/amd64
```

目标服务器为 ARM64，例如部分 ARM 云服务器或 ARM Linux 主机时，改为：

```env
BOX_PLAY_PLATFORM=linux/arm64
```

然后重新执行：

```bash
pnpm play
```

支持值只有：

```text
linux/amd64
linux/arm64
```

架构改变后必须重新构建和导出镜像。不能把 amd64 镜像当作原生 arm64 镜像分发。

## 6. 地图必须来自发布版本

游玩端只接受创作端生成的只读发布目录：

```text
apps/local-engine/projects/<作品ID>/releases/<版本>/
  manifest.json
  data/
    project-state.json
    blobs/
```

不要复制：

```text
apps/local-engine/projects/<作品ID>/source/
```

`source/` 是可编辑工程，不应该挂载给玩家服务器。

有效地图必须满足：

- 最终目录名是合法作品 ID：小写字母、数字和连字符；
- 目录名与 `manifest.json` 中的 `id` 完全一致；
- `manifest.json` 包含版本和 `permissionHash`；
- `data/project-state.json` 存在；
- state 中的 `permissionHash` 与 manifest 一致；
- `data/blobs/` 完整存在。

缺少任一项时，地图不会出现在首页。

## 7. 向正在运行的游玩端增加地图

假设已经发布：

```text
apps/local-engine/projects/island/releases/v1.0.0/
```

推荐先复制到不会被扫描器识别的临时目录，再原子改名：

```bash
cd /path/to/local-engine

cp -R \
  apps/local-engine/projects/island/releases/v1.0.0 \
  apps/local-engine/play-worlds/.island-importing

mv \
  apps/local-engine/play-worlds/.island-importing \
  apps/local-engine/play-worlds/island
```

临时目录以 `.` 开头，不符合地图 ID 规则，因此复制尚未完成时不会被加载。

添加后：

- 大约 3 秒内出现在首页；
- 不需要执行 `docker compose restart`；
- 不需要重新执行 `pnpm play`；
- 不需要重新构建镜像；
- 玩家第一次访问时才启动该地图的独立运行时。

访问：

```text
http://服务器地址:3000/p/island
```

添加第二张地图 `city`：

```text
apps/local-engine/play-worlds/
  island/
    manifest.json
    data/
  city/
    manifest.json
    data/
```

访问：

```text
http://服务器地址:3000/p/city
```

## 8. 更新已有地图

同一个作品 ID 一次只放一个生效版本。先准备新目录：

```bash
cp -R \
  apps/local-engine/projects/island/releases/v1.1.0 \
  apps/local-engine/play-worlds/.island-next
```

然后切换：

```bash
mv apps/local-engine/play-worlds/island \
   apps/local-engine/play-worlds/.island-old

mv apps/local-engine/play-worlds/.island-next \
   apps/local-engine/play-worlds/island
```

确认新版本可正常游玩后删除旧临时目录：

```bash
rm -rf apps/local-engine/play-worlds/.island-old
```

切换后扫描器会停止旧运行时。下一次玩家访问时，新版本运行时会按需启动。正在地图中的玩家
可能会断开，因此生产服务器应在维护窗口更新，并提前通知玩家。

不要直接在正在使用的 `island/data/` 内覆盖大量文件，否则扫描器可能在复制一半时读取到
不完整数据。

## 9. 删除地图

先把目录改为无效的临时名称：

```bash
mv apps/local-engine/play-worlds/island \
   apps/local-engine/play-worlds/.island-disabled
```

约 3 秒后地图会从列表移除，运行时会停止。确认不再需要后再删除备份目录。

删除操作不可恢复，正式删除前应保留发布版本或其他备份。

## 10. 只分发游玩镜像给私服主

仓库模式执行一次 `pnpm play` 后，可分发镜像归档默认位于：

```text
apps/local-engine/dist/images/play-image.tar
```

私服主收到：

```text
play-image.tar
compose.yml
play-worlds/
```

推荐 Compose 文件：

```yaml
services:
  play:
    image: box-local-engine-play:0.1.0
    restart: unless-stopped
    environment:
      BOX_DEPLOYMENT_MODE: play
      BOX_PLAY_LIBRARY_PATH: /app/play-worlds
      BOX_PLAY_ADMIN_TOKEN: ${BOX_PLAY_ADMIN_TOKEN:-}
      BOX_LOCAL_PLAYER_LIMIT: ${BOX_LOCAL_PLAYER_LIMIT:-8}
      PERMISSION_TOKEN_SECRET: ${PERMISSION_TOKEN_SECRET:-}
      BOX_SERVER_PUBLIC_URL: ${BOX_SERVER_PUBLIC_URL:-}
      BOX_TRUST_PROXY: ${BOX_TRUST_PROXY:-false}
    ports:
      - '${BOX_BIND_IP:-127.0.0.1}:${BOX_PLAY_PORT:-3000}:3000'
    volumes:
      - type: bind
        source: ./play-worlds
        target: /app/play-worlds
        read_only: ${BOX_PLAY_LIBRARY_READ_ONLY:-true}
```

同目录 `.env`：

```env
BOX_BIND_IP=0.0.0.0
BOX_PLAY_PORT=3000
BOX_LOCAL_PLAYER_LIMIT=8
PERMISSION_TOKEN_SECRET=请替换为稳定随机值
BOX_PLAY_ADMIN_TOKEN=
BOX_PLAY_LIBRARY_READ_ONLY=true
BOX_SERVER_PUBLIC_URL=
BOX_TRUST_PROXY=false
```

加载镜像并启动：

```bash
docker image load --input play-image.tar
mkdir -p play-worlds
docker compose up -d
```

验证镜像已加载：

```bash
docker image inspect box-local-engine-play:0.1.0
```

以后私服主只需向 `play-worlds/` 增加发布地图，不需要仓库源码、Node.js 或 pnpm。

## 11. 使用单作品游玩部署包

作品管理器导出的单作品包通常包含：

```text
play-image.tar
compose.yml
world/
  manifest.json
  data/
```

进入部署包目录：

```bash
docker image load --input play-image.tar
docker compose up -d
```

这种 Compose 固定挂载 `./world`，适合只运行一个作品。不要直接把多张地图塞进 `world/`。
需要多地图时，改用上一节的 `play-worlds/` Compose。

## 12. 常用配置

| 变量                                | 默认值               | 说明                                                   |
| ----------------------------------- | -------------------- | ------------------------------------------------------ |
| `BOX_IMAGE_TAG`                     | `0.1.0`              | 游玩镜像标签                                           |
| `BOX_BIND_IP`                       | `127.0.0.1`          | 所有网页服务的宿主机监听地址；直接访问时设为 `0.0.0.0` |
| `BOX_PLAY_PORT`                     | `3000`               | 唯一公开端口                                           |
| `BOX_PLAY_PLATFORM`                 | `linux/amd64`        | 分发镜像目标架构                                       |
| `BOX_PLAY_LIBRARY_DIR`              | 仓库内 `play-worlds` | 宿主机多地图库目录                                     |
| `BOX_PLAY_LIBRARY_READ_ONLY`        | `true`               | 地图库是否只读；网页管理导入/删除地图时设为 `false`    |
| `BOX_PLAY_ADMIN_TOKEN`              | 空                   | 服主管理密钥；留空时管理接口关闭                       |
| `BOX_LOCAL_PLAYER_LIMIT`            | `8`                  | 单地图最大连接人数                                     |
| `PERMISSION_TOKEN_SECRET`           | 空                   | 会话签名密钥，正式部署必须固定                         |
| `BOX_SERVER_PUBLIC_URL`             | 空                   | 公网地址，例如 `https://game.example.com`              |
| `BOX_PLAYER_LOGIN_URL`              | 空                   | 可选的服主登录页面；留空时未登录用户看到“未开启登录”   |
| `BOX_PLAYER_AUTH_API_KEY`           | 空                   | 认证接口服务端密钥，至少 16 位，分发部署必填           |
| `BOX_PLAYER_AUTH_ALLOWED_ORIGINS`   | 空                   | 认证接口允许的 Origin 附加白名单，不代替服务端 Key     |
| `BOX_TRUST_PROXY`                   | `false`              | 是否信任反向代理提供的客户端 IP 和协议头               |
| `BOX_SESSION_TTL_MS`                | `60000`              | Session 在连接前的有效时间（毫秒）                     |
| `BOX_PLAYER_REVOCATION_POLL_MS`     | `1000`               | 强制下线事件同步到各地图运行时的间隔（毫秒）           |
| `BOX_SESSION_RATE_LIMIT_PER_MINUTE` | `60`                 | 单 IP 每分钟创建 Session 上限                          |
| `BOX_DATABASE_URL`                  | 空                   | PostgreSQL 连接串；填写后自动启用，只注入服务端容器    |
| `BOX_IDENTITY_DATABASE_SCHEMA`      | `box_identity`       | 玩家账号、会话和审计记录的独立 schema                  |
| `BOX_PLAYER_REGISTRATION_ENABLED`   | `true`               | 是否允许新玩家自助注册；已有账号始终可登录             |
| `BOX_DOCKER_NODE_IMAGE`             | Node 22 Debian 镜像  | 可选构建基础镜像                                       |

数据库账号权限、SSL、多作品隔离和备份参阅
[PostgreSQL 数据空间部署手册](postgresql-data-storage.md)。

正式服生成密钥：

```bash
openssl rand -hex 32
```

更新 `.env` 后重新创建容器：

```bash
docker compose up -d --force-recreate
```

不要在多台需要共享会话语义的实例上使用不同密钥，也不要把真实密钥发给玩家。
更换此密钥会使现有运行时身份断言失效，也会改变脚本看到的 `entity.player.userKey`；
正式服上线后应将它作为需要备份的长期密钥。

## 13. 公网部署和反向代理

公网只需开放游玩端的一个端口，推荐由 Nginx、Caddy 或云负载均衡提供 HTTPS。Nginx 示例：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    server_name game.example.com;

    # ssl_certificate 和 ssl_certificate_key 按实际证书配置

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
```

玩家访问：

```text
https://game.example.com/
https://game.example.com/p/island
```

HTTPS 页面会使用同源 WSS。不要把内部按需运行时端口开放到公网。

## 14. 更新游玩镜像

引擎代码更新后，在构建机器修改镜像标签：

```env
BOX_IMAGE_TAG=0.1.1
```

然后执行：

```bash
pnpm check
pnpm play
```

把新的 `play-image.tar` 和镜像标签交给私服主。私服主执行：

```bash
docker compose down
docker image load --input play-image.tar
docker compose up -d
```

如果 Compose 中写死了镜像标签，也要同步修改。地图位于宿主机 `play-worlds/`，替换镜像不会
删除地图。

## 15. 状态、健康检查和日志

仓库部署查看状态：

```bash
docker compose --profile play ps
```

查看日志：

```bash
docker compose --profile play logs --tail=300 play
docker compose --profile play logs -f play
```

私服独立 Compose：

```bash
docker compose ps
docker compose logs --tail=300 play
docker compose logs -f play
```

HTTP 检查：

```bash
curl http://127.0.0.1:3000/api/health-check
curl http://127.0.0.1:3000/api/play-worlds
```

第二个接口会返回当前识别到的地图列表。访问具体地图：

```bash
curl -I http://127.0.0.1:3000/p/island
```

## 16. 常见问题

### 首页没有地图

检查：

- 最终目录名是否与 `manifest.json.id` 一致；
- 目录名是否只包含小写字母、数字和连字符；
- 是否存在 `data/project-state.json`；
- 是否存在 `data/blobs/`；
- manifest 和 state 的 `permissionHash` 是否一致；
- Compose 是否把正确的宿主机目录挂载为 `/app/play-worlds`；
- 容器是否对目录有读取权限。

查看识别结果：

```bash
curl http://127.0.0.1:3000/api/play-worlds
```

### 新地图放进去后没有立即出现

正常扫描周期约为 3 秒。确认复制已经完成，并且最终目录不是以 `.` 开头的临时目录。

### 页面能打开但进入地图失败

第一次进入地图时才会启动该地图运行时。此时查看：

```bash
docker compose logs -f play
```

重点检查地图数据不完整、permission hash 不一致、blob 缺失和运行时异常退出。

### Docker 镜像架构不匹配

在目标服务器执行：

```bash
docker image inspect \
  --format '{{.Os}}/{{.Architecture}}' \
  box-local-engine-play:0.1.0
```

如果与服务器架构不同，在构建机器设置正确的 `BOX_PLAY_PLATFORM` 后重新执行 `pnpm play`。

### 端口被占用

修改 `.env`：

```env
BOX_PLAY_PORT=3100
```

重新创建容器后访问 `http://服务器地址:3100/`。

### 反向代理下页面正常但游戏断开

确认代理使用 HTTP/1.1，并转发：

```text
Upgrade
Connection
Host
X-Forwarded-Host
X-Forwarded-Proto
```

同时增加 WebSocket 的读取超时时间。

## 17. 安全边界

- 玩家只应获得网址，不需要获得镜像或地图部署包；
- 私服主获得的是游玩镜像和只读发布地图，不是 `.boxproject`；
- 游玩端不能把发布快照直接还原为本项目支持的可编辑工程；
- 浏览器仍必须下载当前场景使用的模型、贴图、音频和 JavaScript；
- 不要把私钥、后台密钥、未发布素材或真正的秘密写入地图资源；
- 重要游戏规则、权限判断和秘密逻辑应留在权威运行时；
- 地图目录应只读挂载；
- 不要把 Docker Socket、创作端 `projects/` 或可编辑 `source/` 挂进游玩容器；
- 环境变量和证书在运行时注入，不要打进镜像。

创作端安装和工程管理参阅 [创作端构建与部署手册](creator-deployment.md) 与
[作品创建、编辑与发布](projects.md)。
