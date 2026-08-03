# Local Engine 启动器

`apps/local-engine` 提供 Box Local Engine 的生产构建脚本、开发启动器、本地配置与离线
资源目录。所有命令都应在仓库根目录执行。

## 运行模式

| 模式 | 构建命令 | 启动命令 | 启动内容 |
| --- | --- | --- | --- |
| 本地一体模式 | `pnpm build` | `pnpm start` | 网页、游玩服务器、创作服务器 |
| 玩家客户端 | `pnpm build:client` | `pnpm start:client` | 仅网页客户端 |
| 专用服务器 | `pnpm build:server` | `pnpm start:server` | 仅游玩服务器 |
| 开发模式 | 无 | `pnpm dev` | 一体模式并启用源码编译 |

默认端口：

- 网页客户端：`3000`
- 游玩服务器：`9966`
- 本地创作服务器：`9967`

创作服务器只用于本机一体模式，专用服务器不会启动或公开 `9967`。

## 数据目录

离线世界、人物、动画和引擎资源位于：

```text
apps/local-engine/data/blobs
```

专用服务器可通过 `BOX_SERVER_DATA_PATH` 修改数据目录。Docker 部署默认使用命名卷挂载
`/app/apps/local-engine/data`。

## 常用配置

```bash
# 专用服务器
BOX_SERVER_HOST=0.0.0.0
BOX_SERVER_PORT=9966
BOX_SERVER_PUBLIC_URL=http://192.168.1.20:9966
BOX_SERVER_NAME="我的世界"

# 玩家客户端
BOX_CLIENT_HOST=0.0.0.0
BOX_CLIENT_PORT=3000
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966
```

完整说明请参阅：

- [项目 README](../../README.md)
- [部署与联机指南](../../docs/deployment.md)
