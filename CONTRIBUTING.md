# BOX3 Engine 贡献者指南

本文面向需要 fork、修改源码、运行完整开发栈、提交 Pull Request，或构建本地镜像/桌面包的开发者。仓库属于私有发行项目；贡献代码不等于获得源代码再分发、商业使用或品牌使用授权。

## 1. 开始前

贡献者应确认自己有权访问上游仓库及其二方源码，不提交真实密钥、许可证私钥、用户数据、数据库备份、地图工程或 Docker 卷。涉及协议、发布包、永久地图 ID、权限或数据空间的修改，必须同步补充回归测试和文档。

不要直接修改 `.next`、`dist` 或 `build`；这些目录是生成物，会在下一次构建时被覆盖。

## 2. Fork 与分支

在 GitHub 页面点击 Fork，然后：

```bash
git clone https://github.com/<your-account>/box-local-engine.git
cd box-local-engine
git remote add upstream https://github.com/ifishcool/box-local-engine.git
git remote -v
```

`origin` 指向自己的 fork，`upstream` 指向官方仓库。同步主线前确认没有本地未提交修改：

```bash
git status --short
git fetch upstream
git switch main
git pull --ff-only upstream main
```

不要在 `main` 上直接开发：

```bash
git switch -c codex/<short-description>
```

例如：`codex/dev-stack`、`codex/voxa-webgl-fix`、`codex/player-revocation-interval`。

## 3. 环境准备

要求：Node.js `22.17.x`（当前锁定 `22.17.0`）、pnpm `10.12.1`、Docker Compose v2。运行完整验证或构建桌面/无图形管理端还需要 Rust stable；macOS App 必须在 macOS 和目标 CPU 架构的原生机器上构建。

```bash
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install --frozen-lockfile
cp .env.docker.example .env
```

`.env` 只保存在本机。使用外部基础服务时配置：

```env
BOX_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_DB=0
```

不要提交 `.env`。

## 4. 完整源码开发

默认入口：

```bash
pnpm dev
```

这会直接启动源码，不使用业务镜像：

| 服务           | 默认地址                 |
| -------------- | ------------------------ |
| Creator        | `http://127.0.0.1:3127/` |
| Play           | `http://127.0.0.1:3121/` |
| VOXA           | `http://127.0.0.1:3123/` |
| Player Service | `http://127.0.0.1:3124/` |
| Auth Portal    | `http://127.0.0.1:3125/` |

默认不会启动或停止 Docker 基础服务；如果没有可用的 PostgreSQL/Redis，明确执行：

```bash
pnpm dev --infra
```

只运行 Creator：

```bash
pnpm dev:creator
```

Ctrl-C 只停止源码进程。Creator、Play、Player Service 使用独立 `.next-*` 和临时 tsconfig；这些文件已加入忽略规则。前端页面、组件和 API 支持热更新，但 `apps/local-engine/src`、`services/game-server/src` 以及通过 `build/dist` 导出的公共包修改后通常需要重启。

## 5. 源码边界

| 领域                             | 目录                                                |
| -------------------------------- | --------------------------------------------------- |
| Creator / Play 前端与 API        | `apps/game/`                                        |
| 项目、地图组、发布和本地生命周期 | `apps/local-engine/src/`                            |
| 权威游戏服务器和脚本运行时       | `services/game-server/src/`                         |
| VOXA 模型、皮肤和动画编辑器      | `apps/voxa/`                                        |
| 登录门户                         | `examples/player-auth-portal/`                      |
| Tauri 桌面启动器                 | `apps/deployment-manager/`、`apps/manager-core/`    |
| Linux Web 管理端                 | `apps/server-manager/`、`apps/server-manager-rust/` |

Creator 编辑可变 `.boxproject`，Play 读取不可变 `.boxplay`。账号、权限、奖励、存档和胜负必须由服务端决定；客户端脚本和资源均视为不可信。

## 6. 测试与验证

快速反馈：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @box-local/voxa build
pnpm --filter @box-local/local-engine test
pnpm --filter @box-local/game-server test
```

完整验证：

```bash
pnpm verify
```

完整验证还包括发行包、Docker 约束、Tauri/Rust 管理端、迁移器和文档检查。涉及 Compose、Dockerfile、权限、数据库 schema、地图组、永久 Map ID、`.boxproject`/`.boxplay`、MuDB 或脚本 API 时，应运行完整验证。

## 7. 构建 VOXA、镜像和桌面 App

只构建 VOXA 生产 App：

```bash
pnpm --filter @box-local/voxa build
```

输出：`apps/voxa/.next/`，standalone 入口为 `apps/voxa/.next/standalone/apps/voxa/server.js`。

构建 VOXA 镜像：

```bash
docker compose --profile voxa build voxa
```

默认镜像标签：`box-local-engine-voxa:0.1.1`。

构建 Apple Silicon 桌面发行包：

```bash
pnpm package:desktop macos-arm64
```

输出：

```text
apps/local-engine/dist/desktop-installers/BOX-Local-Engine-0.1.1-macos-arm64.zip
```

解压后包含：

```text
BOX-Local-Engine-0.1.1-macos-arm64/BOX3 Engine Launcher.app
```

构建完整 arm64 镜像归档：

```bash
pnpm package:images arm64
```

输出：`apps/local-engine/dist/images/box-local-engine-images-v0.1.1-linux-arm64.tar.gz`。

已有匹配归档时，可以跳过镜像重建：

```bash
pnpm package:desktop macos-arm64 \
  apps/local-engine/dist/images/box-local-engine-images-v0.1.1-linux-arm64.tar.gz
```

桌面包必须在目标系统和 CPU 架构原生构建机生成。公开 macOS 发布还需要 Developer ID 签名和公证；本地测试包可能只有 ad-hoc 资源签名。

## 8. 提交规范

提交应小而完整，代码、测试、配置示例和文档一起更新。提交标题使用祈使句并说明范围，例如：

```text
Fix VOXA production build output
Add full source dev stack
Reduce player revocation poll interval
```

提交前运行：

```bash
git status --short
git diff --check
pnpm format:check
```

禁止提交 `.env`、密码、API Key、Cookie、数据库 URL、许可证私钥、`node_modules`、`.next`、`dist`、`build`、Docker 卷、日志、用户地图、模型库和备份。

## 9. Pull Request 要求

PR 描述至少包含：

1. 背景和要解决的问题；
2. 修改范围及影响的服务；
3. 数据格式、协议、配置或权限是否变化；
4. 已运行的命令及结果；
5. UI 修改的截图或录屏；
6. 发行修改的目标架构和构建来源；
7. 已知风险、兼容性和回滚方式。

评审会重点检查服务边界、服务端授权、客户端秘密泄露、数据可恢复性、生产构建可复现性，以及文档是否与真实命令一致。

## 10. 版本与发布纪律

正式发布必须从干净 Git Tag 构建。不要从带未提交修改的工作区制作公开发行包。构建版本、提交、日期和来源由 `BOX_BUILD_VERSION`、`BOX_BUILD_COMMIT`、`BOX_BUILD_DATE`、`BOX_BUILD_SOURCE` 注入。

发布前应在干净机器完成镜像导入、许可证导入、PostgreSQL 初始化、Creator/Play/VOXA/Player Service/登录门户启动、登录与地图进入、停止后再次启动、SHA-256 校验和离线包验证。商业使用、再分发、品牌合作和公开源码镜像需要权利人书面授权。

## 11. 常见问题

### 6379 端口被占用

`pnpm dev` 默认不启动 Docker 基础服务，直接使用 `.env` 的 Redis。只有 `pnpm dev --infra` 才会尝试绑定 6379/5432。

### VOXA 模型为空或 Creator 返回 503

确认 VOXA 在 3123 健康，Creator 的环境包含 `VOXA_URL` 和 `VOXA_INTERNAL_URL`，再检查 `/api/local/models` 和 `/api/local/blobs/<hash>`。生产 App 与开发 App 使用不同数据目录时，确认 `VOXA_DATA_PATH` 指向包含 `models.json` 和 blobs 的目录。

### Next 首次打开很慢

开发模式会为 Creator、Play、Player Service 分别编译同一份 `apps/game`，首次页面请求触发编译是正常的。正式包使用预构建产物，不应以开发模式耗时衡量发布性能。

### WebGL 报 `Vertex buffer is null`

先停止旧开发进程、删除 VOXA 的 `.next` 缓存后重启。VOXA 开发配置关闭了 React Strict Mode 的双挂载；如果生产构建仍复现，应保留浏览器 WebGL 控制台、模型 ID 和 blob 请求状态提交问题。
