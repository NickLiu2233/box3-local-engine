# BOX3 Local Engine 贡献指南

本文说明如何准备环境、运行源码、验证改动、提交 Pull Request 和维护发行文档。仓库属于私有发行项目；提交代码不代表获得源码再分发、商业使用或品牌使用授权。

## 1. 开始前

贡献者需要有权访问仓库及相关二方源码。开始工作前先确认工作区状态，不要覆盖其他协作者的改动：

```bash
git status --short
git remote -v
```

禁止提交真实密钥、许可证私钥、用户数据、数据库备份、地图工程、VOXA 数据、Docker 卷和日志。不要手工修改 `.next*`、`dist/`、`build/`、`target/` 或其他生成物，除非该生成物明确属于仓库发布契约。

## 2. Fork、同步与分支

```bash
git clone https://github.com/<your-account>/box-local-engine.git
cd box-local-engine
git remote add upstream https://github.com/ifishcool/box-local-engine.git
git fetch upstream
git switch main
git pull --ff-only upstream main
git switch -c codex/<short-description>
```

不要直接在 `main` 开发。分支名应简短描述范围，例如 `codex/player-permissions`、`codex/linux-installer` 或 `codex/voxa-model-card`。

## 3. 环境要求

- Node.js `22.17.x`，仓库通过 `.node-version` 固定版本；
- pnpm `10.12.1`；
- Docker Engine 或 Docker Desktop，支持 Docker Compose v2；
- Rust stable，用于管理器测试和桌面 App 构建；
- 目标平台原生构建工具。桌面公开包必须在对应操作系统和 CPU 架构上生成。

安装依赖：

```bash
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install --frozen-lockfile
cp .env.docker.example .env
```

`.env` 只保存在本机。源码开发至少需要 PostgreSQL；Redis 可选。使用外部服务时设置：

```env
BOX_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 4. 启动源码开发环境

```bash
pnpm dev
```

该命令直接运行源码，不使用业务镜像：

| 服务                      | 默认地址                 |
| ------------------------- | ------------------------ |
| Creator                   | `http://127.0.0.1:3127/` |
| Play                      | `http://127.0.0.1:3121/` |
| VOXA                      | `http://127.0.0.1:3123/` |
| Player Service / 玩家管理 | `http://127.0.0.1:3124/` |
| 参考登录门户              | `http://127.0.0.1:3125/` |

`pnpm dev` 默认使用 `.env` 中已有的 PostgreSQL/Redis，不会启动或停止 Docker 基础服务。需要临时开发数据库时执行：

```bash
pnpm dev --infra
```

只开发 Creator 相关功能时可以执行：

```bash
pnpm dev:creator
```

Creator、Play 和 Player Service 使用独立的 `.next-*` 与临时 tsconfig。前端页面通常支持热更新；`apps/local-engine/src/`、`services/game-server/src/` 和公共包构建产物变化后通常需要重启开发栈。

## 5. 代码边界

| 领域                                     | 主要目录                       |
| ---------------------------------------- | ------------------------------ |
| Creator、Play、Player Service 与引擎前端 | `apps/game/`                   |
| 玩家管理后台                             | `apps/player-admin/`           |
| 工程、地图组、发布与运行时生命周期       | `apps/local-engine/src/`       |
| 权威游戏服务器和脚本运行时               | `services/game-server/src/`    |
| VOXA 模型编辑                            | `apps/voxa/`                   |
| 桌面启动器                               | `apps/deployment-manager/`     |
| 桌面/Web 共用管理核心                    | `apps/manager-core/`           |
| Linux Web 管理端                         | `apps/server-manager-rust/`    |
| 登录门户                                 | `examples/player-auth-portal/` |
| 内部迁移工具                             | `apps/migrator/`               |

Creator 编辑可变 `.boxproject`，Play 只运行 `.boxplay` 快照。地图 ID、地图组、Blob/hash、脚本 API、发布清单、MuDB 和运行时协议属于兼容接口；修改前阅读[系统架构](docs/architecture.md)与[对齐基线](docs/boxes-parity.md)。

玩家管理菜单与 API 必须使用同一套 capability。新增页面或写操作时同步修改前端可见性、服务端授权、权限组分类、API 文档和拒绝测试，不能只隐藏按钮。

## 6. 测试

提交前必须运行：

```bash
pnpm verify
```

它依次执行格式检查、Lint、类型检查、Node 回归、发行包检查、文档检查以及 Rust 测试。快速开发时可先运行与改动最相关的命令：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @box-local/local-engine test
pnpm --filter @box-local/game-server test
pnpm --filter @box-local/voxa build
pnpm --filter @box-local/player-admin build
```

涉及 Compose、Dockerfile、安装器、权限、数据库 schema、地图组、地图 ID、`.boxproject`/`.boxplay`、脚本 API 或管理器时，不能只运行局部测试，必须执行完整 `pnpm verify`。

## 7. 文档要求

以下变化必须在同一提交更新根 README、相关 `docs/` 专题、配置示例和回归测试：

- 服务、端口、镜像、安装方式、发行附件或支持平台；
- 环境变量、默认值、管理器表单和 Compose 传递；
- 地图组、发布包、玩家身份、权限、Cookie 或 API；
- 用户可见按钮、菜单、错误信息和删除的功能。

文档只描述已经实现的行为。设计草案必须明确标注“设计”或“历史”，不能混入用户操作步骤。命令应从当前 `package.json`、脚本帮助和工作流核对，不能凭旧版本复制。

## 8. 构建镜像和发行包

构建完整镜像归档：

```bash
pnpm package:images arm64
```

输出示例：

```text
apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-arm64.tar.gz
```

已有当前版本和架构的六个镜像时，可只导出而不重建：

```bash
pnpm export:images
```

构建桌面包：

```bash
pnpm package:desktop macos-arm64
```

支持目标为 `windows-amd64`、`windows-arm64`、`macos-amd64`、`macos-arm64`、`linux-amd64` 和 `linux-arm64`；当前公开流水线不构建 `macos-amd64`。输出示例：

```text
apps/local-engine/dist/desktop-installers/BOX-Local-Engine-0.2.0-macos-arm64.zip
```

使用已有镜像归档可以跳过镜像重建：

```bash
pnpm package:desktop macos-arm64 \
  apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-arm64.tar.gz
```

Linux 无桌面服务器包：

```bash
pnpm package:web arm64
```

输出位于 `apps/local-engine/dist/server-packages/`。完整发布要求见[构建与分发](docs/release-and-distribution.md)。

## 9. 提交与 Pull Request

提交应小而完整，代码、测试、配置与文档一起更新。提交前检查：

```bash
git status --short
git diff --check
pnpm verify
```

Pull Request 至少说明：

1. 问题和目标；
2. 修改范围及受影响服务；
3. 数据、协议、权限和兼容性变化；
4. 已运行的验证命令和结果；
5. UI 改动截图或录屏；
6. 发行改动的目标平台、架构和构建来源；
7. 风险与回滚方式。

评审重点包括服务端授权、秘密泄露、数据可恢复性、跨平台行为、离线包可复现性和文档准确性。

## 10. 发布纪律

主分支和 Pull Request 的 Verify 工作流执行生产依赖审计、Compose 校验和 `pnpm verify`。Tag Release 工作流负责版本/OSS 配置校验、镜像与安装包构建、GitHub Release 及 OSS/CDN 发布；它不会再次执行完整 Verify，因此创建 Tag 前必须确认对应提交的 Verify 已通过。

Release Tag 必须严格等于根 `package.json` 的 `v<version>`。当前版本应使用 `v0.2.0`。不要移动或重复使用已发布 Tag；流水线会按 `box-local-engine/<tag>/` 复用同版本 OSS 中间产物。

公开发布前还应在干净机器验证镜像导入、许可证安装、数据库初始化、登录、地图导入、Creator/Play/VOXA、容器重启、升级保留数据和 SHA-256 校验。Windows 使用 Authenticode；macOS 使用 Developer ID 签名和公证。

## 11. 安全边界

- 不把密钥、权限判定和权威存档放进浏览器或客户端地图脚本；
- 不把 Docker Socket、PostgreSQL、Redis 或管理端裸露到不受信任公网；
- 不在日志、截图、Issue 或 PR 中粘贴 Cookie、Token、数据库 URL 和用户数据；
- 不用删除卷、清空数据库或删除地图目录作为常规排障手段；
- 高风险删除、封禁、Token 撤销和容器操作必须保留确认、授权与审计。

用户发行包适用 [BOX3 Local Engine 本地部署用户许可协议](distribution/LICENSE.txt)。商业使用、再分发和品牌合作需要权利人书面授权。
