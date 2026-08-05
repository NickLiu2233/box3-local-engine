# VOXA 本地模型编辑器构建与部署手册

本文面向需要在 Box Local Engine 创作端制作体素模型的创作者，以及负责制作、迁移和备份
VOXA Docker 镜像的维护者。

VOXA 是独立的本地创作工具，默认运行在 `127.0.0.1:3001`。创作端仍运行在
`127.0.0.1:3000`，两者可以同时启动。VOXA 不属于玩家游玩端，不应部署到公网服务器。

## 1. VOXA 包含什么

VOXA 镜像包含：

- 体素模型和皮肤编辑器网页；
- 本地模型列表；
- 模型工程、模型文件和预览图的本地存储 API；
- 模型历史快照；
- 与 Box Local Engine 创作端的嵌入式编辑协议。

VOXA 本地版不包含：

- 云端账号、登录和用户中心；
- 支付、数据分析和埋点服务；
- 云端 AI 模型服务；
- 原 `boxes` 仓库或其运行时依赖；
- 创作者已经保存的模型数据。

模型数据通过宿主机目录挂载，不会写进镜像。重新构建镜像或删除容器不会删除宿主机上的
模型，但手动删除数据目录会造成数据丢失。

## 2. 地址和数据目录

默认地址：

```text
VOXA 编辑器：http://127.0.0.1:3001/
本地模型库：http://127.0.0.1:3001/library
创作端：http://127.0.0.1:3000/
```

默认宿主机数据目录：

```text
apps/voxa/data/
  models.json       模型索引、名称和快照信息
  blobs/            模型工程、模型文件和预览图
```

Docker 容器内对应目录：

```text
/app/apps/voxa/data
```

`apps/voxa/data/` 已加入 `.dockerignore`，本机模型不会进入 Docker 构建上下文或镜像层。

## 3. 第一次构建并启动

进入仓库根目录：

```bash
cd /path/to/local-engine
cp .env.docker.example .env
```

独立构建并启动 VOXA：

```bash
pnpm voxa
```

该命令只构建 `box-local-engine-voxa` 镜像，然后启动 VOXA 容器。它不会构建创作端或
游玩端镜像。

启动后打开：

```text
http://127.0.0.1:3001/library
```

## 4. 命令区别

| 命令 | 构建镜像 | 启动容器 | 用途 |
| --- | --- | --- | --- |
| `pnpm voxa` | 是，只构建 VOXA | 是 | 首次部署或 VOXA 代码更新后部署 |
| `pnpm voxa:image` | 是，只构建 VOXA | 否 | 只准备独立镜像 |
| `pnpm voxa:up` | 否 | 是 | 已有镜像时直接启动 |
| `pnpm voxa:dev` | 否 | 否，启动源码开发服务 | 引擎维护者开发调试 |
| `pnpm build:voxa` | 否，只生成 Next.js 生产产物 | 否 | 本机验证源码构建 |
| `pnpm stop` | 否 | 停止全部本地产品 | 停止创作端、游玩端和 VOXA |

如果镜像已经存在且代码没有变化，直接执行：

```bash
pnpm voxa:up
```

它不会重新下载依赖或构建镜像。

## 5. 与创作端一起使用

第一次使用时分别启动两个独立镜像：

```bash
pnpm voxa
pnpm creator
```

以后镜像未变化时可以直接启动：

```bash
pnpm voxa:up
pnpm creator:up
```

使用流程：

1. 打开 `http://127.0.0.1:3000/`；
2. 新建或打开一个地图工程；
3. 进入编辑器左侧的“模型”；
4. 点击新建模型，在内嵌 VOXA 中制作；
5. 点击保存；
6. 模型会立即出现在当前地图的模型列表中；
7. 选择模型后即可在场景中放置。

从创作端打开 VOXA 时，模型文件会同时写入：

- `apps/voxa/data/`，用于以后继续编辑模型；
- 当前地图工程的 blob 存储，用于地图保存、发布和游玩。

两边使用相同的内容哈希。若哈希不一致，保存会直接失败，不会把不完整模型加入地图。

本地模式只显示当前作品的模型，不显示原云端的个人模型库和公共模型库。模型按地图 ID
隔离，打开另一张地图时不会混入当前地图的模型列表。

## 6. 独立使用 VOXA

不启动创作端也可以打开：

```text
http://127.0.0.1:3001/library
```

这里可以新建、查看并继续编辑本机模型。独立使用时，文件只保存到 VOXA 数据目录，不会
自动加入某张地图。需要让模型随地图发布时，应从创作端的“模型”入口打开并保存。

### 导出和导入可编辑工程

模型库页面现在提供：

- 作品标题旁的 `导入模型工程`：选择 `.voxaproject` 后直接创建到本地模型库；
- 模型卡片菜单的 `修改模型信息`：修改模型名称和简介；
- 模型卡片菜单的 `导出模型工程`：下载可在其他设备继续编辑的工程文件。

VOXA 编辑器文件菜单也提供两个本地操作：

- `导出 → 导出工程`：下载一个以工程名命名的 `.voxaproject` 文件；
- `导入 → 导入工程`：直接打开系统文件选择器，选择 `.voxaproject` 文件后载入。

旧版本导出的 `.voxa-project` 文件仍可导入，但所有新工程统一导出为不带连字符的
`.voxaproject`。

工程文件包含完整体素工程数据、动画、骨骼、碰撞框、色板、工程名称、工程类型、导出时间
和格式版本。它是给其他创作者继续编辑的文件，不是提供给玩家的运行文件。

从模型库导入工程后，VOXA 会直接在接收方本地模型库中创建一个新模型，不会覆盖导出
设备或当前设备原有的同 ID 模型。从编辑器文件菜单导入时，第一次点击保存后创建新模型。

模型工程和皮肤工程类型不同，不能互相导入。应先打开相同类型的 VOXA 编辑器，再选择
工程文件。

旧的 `V口令` 导入、导出和剪贴板授权流程已经移除，不再依赖口令或剪贴板权限。

## 7. 修改端口

在根目录 `.env` 中设置：

```env
BOX_VOXA_PORT=3101
VOXA_MAX_BLOB_BYTES=268435456
```

然后重新创建 VOXA 和创作端容器，使创作端获得相同地址：

```bash
pnpm voxa
pnpm creator
```

访问地址改为：

```text
http://127.0.0.1:3101/
```

VOXA 和创作端默认只接受本机 `localhost`、`127.0.0.1` 或 `[::1]` 来源。不要把 VOXA
端口绑定到 `0.0.0.0` 或直接暴露到公网。

`VOXA_MAX_BLOB_BYTES` 是单个模型文件、工程文件或预览文件的字节上限，默认 256 MiB。
只有确实需要保存更大的模型文件时才提高它。

## 8. 备份、恢复和迁移

为了得到一致备份，先停止容器：

```bash
pnpm stop
```

完整备份以下目录：

```text
apps/voxa/data/
```

恢复时把整个目录放回相同位置，再执行：

```bash
pnpm voxa:up
```

如果目标设备还没有镜像，则执行：

```bash
pnpm voxa
```

不要只复制 `models.json` 或只复制 `blobs/`。模型索引与内容文件必须一起迁移。

VOXA 数据与地图工程数据是两套用途不同的本地数据：

- VOXA 数据用于继续编辑模型；
- 地图工程数据用于继续编辑和发布地图。

换设备继续完整创作时，应同时迁移 `apps/voxa/data/`，并通过作品管理器导出、导入地图
工程。

## 9. 分发已经构建好的 VOXA 镜像

构建镜像：

```bash
pnpm voxa:image
```

导出镜像：

```bash
docker image save \
  --output box-local-engine-voxa-0.1.0.tar \
  box-local-engine-voxa:0.1.0
```

目标设备导入：

```bash
docker image load --input box-local-engine-voxa-0.1.0.tar
mkdir -p voxa-data
```

最小 `compose.yml`：

```yaml
services:
  voxa:
    image: box-local-engine-voxa:0.1.0
    restart: unless-stopped
    environment:
      VOXA_DATA_PATH: /app/apps/voxa/data
      VOXA_MAX_BLOB_BYTES: 268435456
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - ./voxa-data:/app/apps/voxa/data
```

启动：

```bash
docker compose up -d
```

Linux 如果提示数据目录无写入权限，将目录所有者设置为容器内 Node 用户：

```bash
sudo chown -R 1000:1000 voxa-data
```

## 10. 查看状态和日志

```bash
docker compose --profile voxa ps
docker compose --profile voxa logs --tail=200 voxa
docker compose --profile voxa logs -f voxa
```

健康检查：

```bash
curl http://127.0.0.1:3001/api/health-check
```

模型列表检查：

```bash
curl http://127.0.0.1:3001/api/local/models
```

## 11. 常见问题

### 创作端中没有“模型”入口

确认打开的是编辑地址 `/e/<作品ID>`，而不是玩家地址 `/p/<作品ID>`，并确认当前工程具有
模型编辑权限。

### 点击新建模型后提示启动失败

先检查 VOXA：

```bash
docker compose --profile voxa ps
curl http://127.0.0.1:3001/api/health-check
```

镜像已存在但容器未运行时执行：

```bash
pnpm voxa:up
```

### 保存后列表没有刷新

确认浏览器没有混用 `localhost` 和远程地址。创作端与 VOXA 默认都应使用
`127.0.0.1`。随后查看 VOXA 和创作端浏览器控制台中的保存错误。

### 重建后模型消失

检查 `apps/voxa/data/` 是否仍存在，以及 Compose 是否仍挂载到
`/app/apps/voxa/data`。镜像内不保存创作者模型，必须依靠宿主机目录。

### 能否把 VOXA 部署给普通玩家

不建议。VOXA 是编辑器，拥有模型创建、修改和删除能力。普通玩家只应访问游玩端网址，
不应获得 VOXA 或创作端地址。
