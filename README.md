# BOX3 Local Engine

BOX3 Local Engine 是一个本地优先的多人联机 3D 创作与游玩发行版。它提供地图创作、VOXA 模型编辑、只读地图发布、多人房间、玩家身份、权限组、运行容器和图形化部署能力。正常创作与游玩所需的引擎资源及预置玩家皮肤均包含在仓库或离线镜像中，不依赖 BOX3 云端资源服务。

当前版本：`0.2.0`。项目仍处于发布候选阶段；公开发行必须由干净的 `v0.2.0` Tag 构建，并完成对应平台的代码签名要求。

## 选择使用方式

| 目标                             | 从这里开始                                               |
| -------------------------------- | -------------------------------------------------------- |
| Windows、macOS 或 Linux 桌面部署 | [图形化部署管理器](docs/graphical-deployment-manager.md) |
| 无桌面的 Linux 服务器            | [Linux Web 管理端](docs/linux-web-manager.md)            |
| 云服务器一键安装                 | [云服务器快速部署](docs/cloud-server-quickstart.md)      |
| 创建、导入和发布地图             | [地图、地图组与发布包](docs/projects.md)                 |
| 玩家账号、权限组和后台管理       | [玩家身份与后台管理](docs/player-identity.md)            |
| 配置端口、数据库和资源限制       | [配置参考](docs/configuration-reference.md)              |
| 开发、测试或提交代码             | [贡献者指南](CONTRIBUTING.md)                            |
| 查看或开发 HTTP API              | [Local Engine API 与 Swagger](docs/local-engine-api.md)  |
| 构建镜像与发行包                 | [构建与分发](docs/release-and-distribution.md)           |
| 查看全部专题                     | [文档中心](docs/README.md)                               |

Linux 服务器可以直接执行：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh | sudo bash
```

安装器支持 Linux `amd64` 和 `arm64`，会准备 Docker Engine 与 Compose v2、下载匹配的服务器包、保留已有数据完成升级，并输出管理地址和初始密钥。服务器部署前请先阅读[安全与公网访问要求](docs/linux-web-manager.md#8-网络与防火墙)。

## 产品组成

| 服务               | 职责                                   | 源码开发地址             |
| ------------------ | -------------------------------------- | ------------------------ |
| Creator            | 地图作品、地图组、编辑、预览与发布     | `http://127.0.0.1:3127/` |
| Play               | 地图大厅、公开房间和 Teleport 私有房间 | `http://127.0.0.1:3121/` |
| VOXA               | 模型、皮肤和动画编辑                   | `http://127.0.0.1:3123/` |
| Player Service     | 玩家登录、后台 API、权限和审计         | `http://127.0.0.1:3124/` |
| Player Admin       | 后台管理前端（仅源码开发时独立）       | `http://127.0.0.1:8000/` |
| Player Auth Portal | 可替换的参考登录/注册门户              | `http://127.0.0.1:3125/` |
| Server Manager     | Linux 无桌面环境的 Web 管理端          | `http://127.0.0.1:3130/` |

Player Admin 在发行镜像中构建进 Player Service，不是第七个业务镜像；只有源码开发时才由 Umi 在 `8000` 端口独立提供热更新，并把 `/api` 代理到 `3124`。桌面版本使用 Tauri 启动器管理五个业务服务；Linux 服务器版本使用 Server Manager 提供同一套配置和运维能力。完整离线镜像归档包含六个镜像。无桌面服务器包包含 Creator、VOXA、Play、Player Service、参考登录门户和 Server Manager。关闭桌面启动器窗口不会停止已经运行的容器。

后台管理由 Player Service 在根路径提供，当前主要功能包括：

- 玩家账号、会话、标签、备注、封禁、密码重置和 CSV 导出；
- 独立后台账号、权限组、查看/编辑能力和安全审计；
- Creator 访问权限与一次性展示的 CLI Token；
- `.boxplay` 地图包预览、导入、开放、关闭和删除；
- 服主或管理员可开启的 Play 本地资源加速：为已发布地图的公开地形、模型、贴图、图片、音频和其他静态资源建立浏览器缓存；客户端/服务端脚本、私有发布数据、账号信息及实时状态不会缓存。缓存按永久地图 ID 和资源清单版本隔离，详见 [游玩端部署说明](docs/play-deployment.md#本地资源加速)；
- 创作端/游玩端运行时、地图容器配置及资源组；
- 独立 Docker 地图容器的 CPU、内存、进程、网络和出网带宽限制。

Play 游戏内不再提供旧的“服主管理”。地图导入和日常管理统一在后台管理的“游玩管理”中完成。

## 技术栈

| 领域                 | 主要技术                                                   |
| -------------------- | ---------------------------------------------------------- |
| Monorepo 与工程管理  | Rush.js、pnpm、Node.js、TypeScript                         |
| API 契约与交互文档   | OpenAPI 3.1、Swagger UI、openapi-typescript、openapi-fetch |
| Creator 与 Play      | Next.js、React、TypeScript、WebGL                          |
| VOXA                 | Next.js、React、TypeScript、WebGL                          |
| 后台管理             | Umi Max、React、Ant Design、LESS                           |
| 游戏服务端           | Node.js、TypeScript、WebSocket、自研 MuDB 协议             |
| 桌面启动器           | Tauri 2、Rust、Vite                                        |
| Linux 管理端         | Rust、Axum、Tokio                                          |
| 玩家登录与许可证服务 | React、esbuild、Fastify、Ed25519                           |
| 数据与资源存储       | PostgreSQL、Redis、文件系统内容寻址 Blob                   |
| 部署、交付与持续集成 | Docker、Docker Compose、GitHub Actions                     |
| 代码质量             | ESLint、Prettier、TypeScript 类型检查、自动化回归测试      |

Creator、Play 和 VOXA 的 3D 画面由浏览器 WebGL 渲染。Linux 服务端负责业务服务、权威游戏逻辑和地图运行容器，正常部署不要求 GPU。

## 数据边界

- Creator 保存可编辑 `.boxproject`；发布生成只读 `.boxplay` 地图组包。
- 一个地图组包含一个主地图和零到多个副地图。成员地形、实体和脚本独立，共享地图组资源和组数据空间。
- PostgreSQL 是玩家、会话、权限、审计和地图脚本持久数据的正确性来源，必须单独备份。
- Redis 是可选的会话、限流和构建协调缓存，不保存永久业务数据。
- `box-play-runtime-cache` 只保存可再生成的预烘焙和构建产物，不是数据库。
- Creator 工程、Play 地图库、VOXA 模型数据、`.env` 和许可证文件均需按部署方式单独备份。
- 桌面安装数据与源码工作区数据彼此独立；需要通过工程包、游玩包或备份迁移。

服务端地图脚本在 game-server 的隔离运行时中执行，负责权威规则和持久数据。客户端地图脚本运行在玩家浏览器页面中，玩家可以查看或修改其执行环境，因此不能保存密码、Token、数据库连接串、付费判定、奖励规则或其他秘密。

## 源码快速开始

要求：Node.js `22.17.x`、Docker Compose v2。Rush 会自动安装仓库锁定的 Rush `5.156.0` 和 pnpm `10.12.1`；完整验证和桌面 App 构建还需要 Rust stable 及目标平台原生工具链。

```bash
npm run install:all
cp .env.docker.example .env
```

根 npm 命令会自动下载仓库锁定的 Rush，无需预先全局安装。已经安装 Rush `5.156.0` 的贡献者也可以直接执行 `rush install`。

启动完整源码开发栈：

```bash
npm run dev
```

`rush dev` 直接运行 Creator、Play、VOXA、Player Service 和参考登录门户源码，默认连接 `.env` 中已有的 PostgreSQL/Redis。没有可用基础服务时使用：

```bash
npm run dev:infra
```

只启动 Creator 相关开发服务：

```bash
npm run dev:creator
```

后台管理前端需要另开终端启动：

```bash
cd apps/player-admin
npm run dev
```

开发页面访问 `http://127.0.0.1:8000/`，请求会代理到 Player Service `3124`。发行模式不需要单独启动该前端。

常用命令：

| 命令                                        | 作用                                   |
| ------------------------------------------- | -------------------------------------- |
| `rush dev`                                  | 启动完整源码开发栈                     |
| `rush dev --infra`                          | 启动开发栈并启动开发 PostgreSQL/Redis  |
| `rush dev-creator`                          | 启动 Creator 相关开发服务              |
| `rush dev-creator --infra`                  | 启动 Creator 开发服务及基础设施        |
| `cd apps/player-admin && npm run dev`       | 启动后台管理前端热更新服务             |
| `npm run api:docs`                          | 独立启动只读 Swagger API 文档          |
| `rush build --to <项目名>`                  | 按依赖顺序增量构建指定项目             |
| `rush package-images --architecture <架构>` | 构建六个 Linux 镜像并导出归档          |
| `rush export-images`                        | 不重建，导出本机已有的完整镜像集合     |
| `rush package-desktop --target <目标>`      | 生成目标平台桌面离线包                 |
| `rush package-web --architecture <架构>`    | 生成 Linux 无桌面服务器包              |
| `rush verify`                               | 执行格式、Lint、类型检查和全部回归测试 |

根 `package.json` 同时提供便于发现的 npm 别名，例如 `npm run dev`、`npm run verify`、`npm run package:images:arm64`、`npm run package:desktop:macos-arm64` 和 `npm run package:web:amd64`。需要自定义参数时，可在 `--` 后继续传给 Rush：

```bash
npm run build -- --to @box/player-admin
npm run package:images -- --architecture arm64 --service player-service
```

例如构建 Apple Silicon macOS 包：

```bash
rush package-desktop --target macos-arm64
```

输出：

```text
apps/local-engine/dist/desktop-installers/BOX-Local-Engine-0.2.0-macos-arm64.zip
```

按 `Ctrl-C` 停止源码服务。使用 `--infra` 启动的 PostgreSQL/Redis 不会删除数据卷；需要单独停止时执行：

```bash
docker compose --profile infra stop postgres redis
```

## 仓库结构

顶层目录按 Rush 多项目仓库的职责分类，与 `boxes` 保持相同的主体结构：

| 路径            | 职责                                                 |
| --------------- | ---------------------------------------------------- |
| `apps/`         | 可独立运行、构建或发布的产品应用                     |
| `services/`     | 权威后端服务与脚本运行时                             |
| `packages/`     | 可复用的引擎、协议、UI 和工具包                      |
| `internals/`    | 仅供仓库内部使用的 API、Schema、环境与构建基础设施   |
| `tools/`        | 仓库工具项目与平台专用启动器                         |
| `types/`        | 跨项目共享的类型声明                                 |
| `common/`       | Rush 配置、锁文件、安装器和变更记录                  |
| `docs/`         | 架构、领域模型、开发、部署与运维文档                 |
| `distribution/` | 安装器、服务器包、独立部署和许可模板                 |
| `scripts/`      | 仓库级开发、回归、打包和发布命令                     |
| `license/`      | 本机许可证运行目录；仅保留占位文件，运行数据禁止入库 |

`distribution/` 和 `scripts/` 是发布与仓库命令的稳定入口，因此保留在根目录。正式应用必须放入 `apps/`，不要用 `examples/` 承载生产服务，也不要在根目录新增临时项目、构建产物或本机数据。

主要应用入口：

| 路径                        | 职责                                           |
| --------------------------- | ---------------------------------------------- |
| `apps/game/`                | Creator、Play、Player Service 页面与引擎客户端 |
| `apps/player-admin/`        | 后台管理 Umi 前端                              |
| `apps/local-engine/`        | 工程、地图组、发布包和运行时生命周期           |
| `apps/voxa/`                | VOXA 模型、皮肤和动画编辑器                    |
| `apps/deployment-manager/`  | Vite + Tauri 桌面启动器                        |
| `apps/manager-core/`        | 桌面端和服务器管理端共用 Rust 业务核心         |
| `apps/server-manager-rust/` | Linux Web 管理服务                             |
| `apps/player-auth-portal/`  | 玩家登录与注册门户                             |
| `apps/migrator/`            | 内部迁移工具，不进入普通用户发行包             |
| `services/game-server/`     | 权威游戏运行时、脚本和数据存储                 |

## 参与开发

希望在地图里自动处理违规玩家，可以参考[地图脚本管理接口](docs/script-moderation.md)。授权由服主在后台绑定，脚本不需要保存管理员密钥。

新人建议先阅读[开发者与协作手册](docs/developer-guide.md)，它完整说明环境准备、Rush 依赖管理、源码启动、模块定位、测试、镜像与发行包构建、部署验证和常见故障。准备提交代码时，再按[贡献者指南](CONTRIBUTING.md)完成分支同步、提交检查和 Pull Request。

最短开发流程：

```bash
git switch -c codex/<short-description>
rush install
cp .env.docker.example .env
rush dev --infra
# 完成修改和相关局部测试
rush verify
git status --short
git diff --check
```

修改依赖或增加 Rush 项目时使用 `rush update`，并提交 `common/config/rush/pnpm-lock.yaml`。普通拉取只使用 `rush install`。不要重新创建 pnpm Workspace 文件，也不要提交 `.env`、数据库、地图、模型、日志、Docker 卷和本地构建产物。

## 发行范围

当前 Tag 流水线构建：

- Windows x64 与 Windows ARM64 桌面 ZIP；
- Apple Silicon macOS 桌面 ZIP；
- Linux x64 与 Linux ARM64 桌面 ZIP；
- Linux amd64/arm64 无桌面服务器 ZIP；
- Linux amd64/arm64 完整镜像归档（仅作为流水线中间产物存入 OSS）。

GitHub Release 发布桌面包、服务器包和 `install.sh`。Linux 服务器的 `install.sh`、`latest.txt` 与两个架构的版本包同时发布到 OSS 的 `local-engine/` 目录，由 `https://assets.box3.fun/local-engine/` 提供下载。Tag 流水线会校验 Tag 与项目版本及 OSS Secret，但不会替代主分支和 Pull Request 的 `rush verify`；创建 Tag 前必须先完成完整验证。

## 许可与安全

部署和启动业务服务前需要安装有效许可证。个人学习许可证绑定设备，仅限对应许可范围；使用说明见[个人学习许可证](docs/licensing.md)。

仓库 npm 元数据为 `UNLICENSED`，不授予源代码开源许可。用户发行包适用 [BOX3 Local Engine 本地部署用户许可协议](distribution/LICENSE.txt)。商业使用、二次开发、再分发或品牌合作需要取得权利人书面授权。

不要提交或发布真实 `.env`、数据库连接串、密码、Cookie、Token、许可证私钥、用户 IP、地图工程、模型库、备份、日志、Docker 卷或构建缓存。
