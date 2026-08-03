# BOX 玩家客户端

`apps/game` 是 Box Local Engine 的浏览器客户端，同时包含本地一体模式使用的创作界面。

## 玩家客户端模式

在仓库根目录构建并启动：

```bash
pnpm build:client
pnpm start:client
```

打开连接页：

```text
http://127.0.0.1:3000/connect
```

输入玩家能够访问的专用服务器地址，例如：

```text
http://192.168.1.20:9966
```

也可以通过环境变量预设服务器：

```bash
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966 pnpm start:client
```

远程服务器地址的优先级为：

1. 页面查询参数 `?server=...`
2. `BOX_REMOTE_SERVER_URL`
3. 浏览器 `localStorage` 中上次成功使用的地址
4. 本地一体模式的默认服务器

玩家客户端不会启动或检查本地游戏服务端、地图 blobs 和人物资源。访问 `/e/...` 创作
地址时会自动重定向到 `/connect`。

`build:client` 是真实的 player-only 构建，不是运行时隐藏编辑器：构建期间会把编辑页、
管理员客户端和管理员界面替换为轻量 adapter，并且不复制 Monaco 编辑器资源。生成的
`.next/standalone` 只包含玩家网页运行时实际需要的文件。

`start:client` 会检查 player-only 构建标记，避免误把含创作端的完整构建作为玩家客户端
发布。反过来，`pnpm start` 也会拒绝使用 player-only 构建启动本地创作端。

可配置客户端监听地址与端口：

```bash
BOX_CLIENT_HOST=0.0.0.0 BOX_CLIENT_PORT=3000 pnpm start:client
```

## 本地一体模式

需要创作界面时，应从仓库根目录运行：

```bash
pnpm build
pnpm start
```

入口：

- 游玩端：<http://127.0.0.1:3000/p/local>
- 创作端：<http://127.0.0.1:3000/e/local>

## Docker

构建和启动玩家客户端镜像：

```bash
docker compose build client
docker compose up -d client
```

`BOX_REMOTE_SERVER_URL` 必须是玩家浏览器能够访问的 IP 或域名，不能填写 Docker 内部
服务名 `server`。

玩家镜像只复制 Next standalone 产物，不复制 `apps/game/src`、`packages`、`internals`
或服务端源码。

完整说明请参阅：

- [项目 README](../../README.md)
- [部署与联机指南](../../docs/deployment.md)
