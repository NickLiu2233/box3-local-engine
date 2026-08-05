# Local Engine 启动器

`apps/local-engine` 负责协调 Box Local Engine 的构建、启动、本地工程和离线资源。所有
用户命令都应在仓库根目录执行。

## 对外运行模式

| 模式 | 部署命令 | 包含内容 |
| --- | --- | --- |
| 创作端 | `pnpm creator` | 作品管理、编辑、预览和发布 |
| 游玩端 | `pnpm play` | 玩家网页和多个只读作品 |
| VOXA | `pnpm voxa` | 本地体素模型编辑和模型库 |
| 开发模式 | `pnpm dev` | 启用源码编译的创作端 |

创作者和服主只选择一种产品模式。启动器会协调内部进程，并在任一必要进程异常退出时停止
整套运行环境。

两种产品都只公开 `3000`。地图资源、编辑请求与 WebSocket 会通过同源网关转到容器内
运行时，使用者不需要了解或开放内部端口。

## 常用入口

- 创作端：<http://127.0.0.1:3000/>

具体作品使用 `/e/<project-id>` 和 `/p/<project-id>`。应先从作品管理器启动工程，不要
手动修改运行时端口或工程状态文件。

## 数据目录

默认离线资源位于：

```text
apps/local-engine/data/blobs
```

本地作品位于：

```text
apps/local-engine/projects/<project-id>
```

创作端需要对工程目录拥有读写权限。游玩端只应读取发布快照，不能获得或挂载作品的
`source/` 目录。

Docker 创作端把工程保存到宿主机 `apps/local-engine/projects/`。停止或重建容器不会删除
该目录；手动清理前先从作品管理器导出可编辑工程。

## Docker

```bash
# 创作端
pnpm creator

# 已有镜像时直接启动，不重新构建
pnpm creator:up

# VOXA 本地模型编辑器
pnpm voxa

# 已有 VOXA 镜像时直接启动
pnpm voxa:up

# 游玩端
pnpm play

# 停止当前部署
pnpm stop
```

两个命令独立构建：`pnpm creator` 只构建创作端镜像，`pnpm play` 只构建游玩端镜像。
第一次导出包含 `play-image.tar` 的单作品部署包前，需要先执行一次 `pnpm play` 准备游玩
镜像，然后执行 `pnpm creator:up` 回到创作端。以后镜像未变化时不需要重复构建。

`pnpm play` 从 `play-worlds/` 自动发现作品。每个作品目录包含 `manifest.json` 和
`data/`，可在运行期间继续放入新地图，无需重建镜像或重启容器。发布目录应整体复制为：

```text
play-worlds/<manifest 中的作品 ID>/
  manifest.json
  data/
```

给其他服主时，可以只分发 `play-image.tar`，并让对方把自己的 `play-worlds/` 只读挂载到
容器的 `/app/play-worlds`。具体 Compose 配置参阅部署指南。作品管理器原有的“单作品游玩
部署包”固定绑定一个地图；一台服务器同时放多个地图时使用上述地图库模式。创作端和游玩端
通常占用相同网页端口，同一台电脑上默认一次只运行一种。

完整说明：

- [项目 README](../../README.md)
- [创作端构建与部署手册](../../docs/creator-deployment.md)
- [游玩端构建与部署手册](../../docs/play-deployment.md)
- [部署与联机指南](../../docs/deployment.md)
- [VOXA 本地模型编辑器手册](../../docs/voxa-deployment.md)
- [本地工程与发布包](../../docs/projects.md)
