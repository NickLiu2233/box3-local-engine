# BOX3 Local Engine

BOX3 Local Engine 把地图创作、模型制作、多人游玩和玩家管理放在自己的电脑或服务器上运行。你可以在 Creator 中制作地图，用 VOXA 编辑模型，再把作品发布到 Play，邀请其他玩家一起体验。

正常创作与游玩所需的引擎资源和预置玩家皮肤包含在仓库或离线镜像中，不依赖 BOX3 云端资源服务。桌面启动器负责配置和管理服务，Linux 服务器也可以通过 Web 管理端维护。

当前源码版本：`0.3.0`。项目已全面开源，公开仓库为 [ifishcool/box-local-engine](https://github.com/ifishcool/box-local-engine)，任何人都可以阅读、克隆、Fork 并提交 Pull Request。代码采用 MIT；当前能力与验证限制见[版本说明](docs/current-status.md)。

## 选择使用方式

| 目标                                   | 从这里开始                                               |
| -------------------------------------- | -------------------------------------------------------- |
| Windows、macOS 或 Linux 桌面部署       | [图形化部署管理器](docs/graphical-deployment-manager.md) |
| 无桌面的 Linux 服务器                  | [Linux Web 管理端](docs/linux-web-manager.md)            |
| 云服务器一键安装                       | [云服务器快速部署](docs/cloud-server-quickstart.md)      |
| 创建、导入和发布地图                   | [地图、地图组与发布包](docs/projects.md)                 |
| 玩家账号、权限组和后台管理             | [玩家身份与后台管理](docs/player-identity.md)            |
| 授权地图脚本封禁或查询处罚             | [地图授权与脚本处罚 API](docs/script-moderation.md)      |
| 配置端口、数据库和资源限制             | [配置参考](docs/configuration-reference.md)              |
| 开发、测试或提交代码                   | [贡献者指南](CONTRIBUTING.md)                            |
| 查看或开发 HTTP API                    | [Local Engine API 与 Swagger](docs/local-engine-api.md)  |
| 构建镜像与发行包                       | [构建与分发](docs/release-and-distribution.md)           |
| 在其他项目复用权限、实时连接或部署路径 | [可复用公共包](docs/reusable-packages.md)                |
| 查看全部专题                           | [文档中心](docs/README.md)                               |

只想部署使用，不需要安装源码开发环境。已发布安装包见 [GitHub Releases](https://github.com/ifishcool/box-local-engine/releases)，部署步骤按上表选择；源码版本不代表某个已下载安装包已更新。公网部署前请先阅读[网络与防火墙要求](docs/linux-web-manager.md#8-网络与防火墙)。

## 产品组成

除了创作与游玩，当前还提供：

- 玩家账号、权限组、封禁和操作审计；
- 可替换的登录门户，支持登录、注册和修改密码；
- 由服主在后台配置的地图脚本授权，脚本无需保存管理员密钥；
- 服务端反作弊监听与拒绝处理，由图主根据地图玩法编写规则。

运行程序不需要源码访问许可或激活；服务器账号与权限仍由服主管理。功能边界见[版本说明](docs/current-status.md)。

| 服务               | 职责                                   | 源码开发地址             |
| ------------------ | -------------------------------------- | ------------------------ |
| Creator            | 地图作品、地图组、编辑、预览与发布     | `http://127.0.0.1:3127/` |
| Play               | 地图大厅、公开房间和 Teleport 私有房间 | `http://127.0.0.1:3121/` |
| VOXA               | 模型、皮肤和动画编辑                   | `http://127.0.0.1:3123/` |
| Player Service     | 玩家登录、后台 API、权限和审计         | `http://127.0.0.1:3124/` |
| Player Admin       | 后台管理前端（仅源码开发时独立）       | `http://127.0.0.1:8000/` |
| Player Auth Portal | 可替换的参考登录/注册门户              | `http://127.0.0.1:3125/` |
| Server Manager     | Linux 无桌面环境的 Web 管理端          | `http://127.0.0.1:3130/` |

Player Admin 在发行镜像中构建进 Player Service，不是第七个业务镜像；只有源码开发时才由 Umi 在 `8000` 端口独立提供热更新，并把 `/api` 代理到 `3124`。桌面版本使用轻量 Tauri 启动器，首次启动服务时下载并校验当前架构镜像，管理五个业务服务；Linux 服务器版本使用 Server Manager 提供同一套配置和运维能力。服务器安装 ZIP 不内置 Docker 镜像：安装时下载 Server Manager，Creator、VOXA、Play、Player Service 和登录门户镜像则按需下载。关闭桌面启动器窗口不会停止已经运行的容器。

地图导入和日常管理统一在玩家管理后台完成，Play 游戏内不再提供旧的“服主管理”。后台还负责账号权限、地图运行容器、脚本授权和安全记录，详见[玩家身份与后台管理](docs/player-identity.md)。公开静态资源的缓存边界见[资源缓存说明](docs/launcher-service-worker-cache.md)。

## 技术栈

独立[玩家启动器](docs/player-launcher.md)使用 Electron，负责连接服务器和启动地图；Tauri 桌面启动器负责部署运维，两者不是同一个应用。

主工程使用 Rush 管理 TypeScript/Node.js 项目和依赖。创作与游玩界面使用 Next.js、React 和 WebGL，后台使用 Umi 与 Ant Design；桌面启动器使用 Tauri，桌面端与 Linux Web 管理端共用 Rust 业务核心。玩家数据保存在 PostgreSQL，Redis 用作可选缓存，部署使用 Docker Compose。HTTP API 通过 OpenAPI 维护契约和文档。

3D 画面由浏览器 WebGL 渲染，服务器负责业务服务、权威游戏逻辑和地图运行容器，正常部署不要求 GPU。

## 数据边界

- Creator 保存可编辑 `.boxproject`；发布生成只读 `.boxplay` 地图组包。
- 一个地图组包含一个主地图和零到多个副地图。成员地形、实体和脚本独立，共享地图组资源和组数据空间。
- PostgreSQL 是玩家、会话、权限、审计和地图脚本持久数据的正确性来源，必须单独备份。
- Redis 是可选的会话、限流和构建协调缓存，不保存永久业务数据。
- `box-play-runtime-cache` 只保存可再生成的预烘焙和构建产物，不是数据库。
- Creator 工程、Play 地图库、VOXA 模型数据、`.env` 均需按部署方式单独备份。
- 桌面安装数据与源码工作区数据彼此独立；需要通过工程包、游玩包或备份迁移。

服务端地图脚本在 game-server 的隔离运行时中执行，负责权威规则和持久数据。客户端地图脚本运行在玩家浏览器页面中，玩家可以查看或修改其执行环境，因此不能保存密码、Token、数据库连接串、付费判定、奖励规则或其他秘密。

## 源码快速开始

直接克隆公开仓库；准备贡献代码时先 Fork，按[贡献指南](CONTRIBUTING.md)创建主题分支。

要求：Node.js `22.17.x`、Docker Compose v2。Rush 会自动安装仓库锁定的 Rush `5.156.0` 和 pnpm `10.12.1`；完整验证和桌面 App 构建还需要 Rust stable 及目标平台原生工具链。

```bash
git clone https://github.com/ifishcool/box-local-engine.git
cd box-local-engine
npm run install:all
npm run check:workspace
cp .env.docker.example .env
```

根 npm 命令会自动下载仓库锁定的 Rush，无需预先全局安装。已经安装 Rush `5.156.0` 的贡献者也可以直接执行 `rush install`。

启动完整源码开发栈：

```bash
npm run dev
```

`rush dev` 先准备共享编译依赖，再运行 Creator、Play、VOXA、Player Service、参考登录门户和玩家后台源码，默认连接 `.env` 中已有的 PostgreSQL/Redis。没有可用基础服务时使用：

```bash
npm run dev:infra
```

只启动 Creator 相关开发服务：

```bash
npm run dev:creator
```

后台管理前端默认已启动在 `8000`。只开发该前端、已有 Player Service 时，可单独执行：

```bash
npm run dev:admin
```

开发页面访问 `http://127.0.0.1:8000/`，请求会代理到 Player Service `3124`。发行模式不需要单独启动该前端。

玩家启动器用 `npm run dev:player-launcher`，部署管理器前端用 `npm run dev:manager`。项目登记、Rush/npm 命令对照及已有镜像部署见[Rush 工作区指南](docs/rush-workspace.md)。

API 文档可单独通过 `npm run api:docs` 启动。提交改动前运行 `npm run verify`（等价于 `rush verify`）；详细开发步骤见[贡献者指南](CONTRIBUTING.md)，镜像与桌面打包命令见[构建与分发](docs/release-and-distribution.md)。

按 `Ctrl-C` 停止源码服务。使用 `--infra` 启动的 PostgreSQL/Redis 不会删除数据卷；需要单独停止时执行：

```bash
docker compose --profile infra stop postgres redis
```

## 仓库结构

顶层目录按职责分类：

| 路径            | 职责                                               |
| --------------- | -------------------------------------------------- |
| `apps/`         | 可独立运行、构建或发布的产品应用                   |
| `services/`     | 权威后端服务与脚本运行时                           |
| `packages/`     | 可复用的引擎、协议、UI 和工具包                    |
| `internals/`    | 仅供仓库内部使用的 API、Schema、环境与构建基础设施 |
| `tools/`        | 仓库工具项目与平台专用启动器                       |
| `types/`        | 跨项目共享的类型声明                               |
| `common/`       | Rush 配置、锁文件、安装器和变更记录                |
| `docs/`         | 架构、领域模型、开发、部署与运维文档               |
| `distribution/` | 安装器、服务器包、独立部署和发行许可文件           |
| `scripts/`      | 仓库级开发、回归、打包和发布命令                   |

`distribution/` 和 `scripts/` 是发布与仓库命令的稳定入口，因此保留在根目录。正式应用必须放入 `apps/`，不要用 `examples/` 承载生产服务，也不要在根目录新增临时项目、构建产物或本机数据。

主要应用入口：

| 路径                        | 职责                                           |
| --------------------------- | ---------------------------------------------- |
| `apps/game/`                | Creator、Play、Player Service 页面与引擎客户端 |
| `apps/player-admin/`        | 后台管理 Umi 前端                              |
| `apps/player-launcher/`     | Electron 玩家启动器                            |
| `apps/local-engine/`        | 工程、地图组、发布包和运行时生命周期           |
| `apps/voxa/`                | VOXA 模型、皮肤和动画编辑器                    |
| `apps/deployment-manager/`  | Vite + Tauri 桌面启动器                        |
| `apps/manager-core/`        | 桌面端和服务器管理端共用 Rust 业务核心         |
| `apps/server-manager-rust/` | Linux Web 管理服务                             |
| `apps/player-auth-portal/`  | 玩家登录与注册门户                             |
| `services/game-server/`     | 权威游戏运行时、脚本和数据存储                 |

## 参与开发

欢迎通过 [Issues](https://github.com/ifishcool/box-local-engine/issues)反馈问题或讨论改进。贡献代码时 Fork 公开仓库，在自己的主题分支完成修改与验证，再向上游 `main` 提交 Pull Request；不需要申请邀请或上游写入权限。完整流程见[贡献指南](CONTRIBUTING.md)与[源码协作](docs/source-access.md)。

后台页面复用入口见[后台管理开发说明](docs/player-admin-development.md)与[复用索引](docs/player-admin-code.md)。

希望在地图里自动处理违规玩家，可以参考[地图脚本管理接口](docs/script-moderation.md)。授权由服主在后台绑定，脚本不需要保存管理员密钥。

新人建议先阅读[开发者与协作手册](docs/developer-guide.md)，它完整说明环境准备、Rush 依赖管理、源码启动、模块定位、测试、镜像与发行包构建、部署验证和常见故障。准备提交代码时，再按[贡献者指南](CONTRIBUTING.md)完成分支同步、提交检查和 Pull Request。

遇到问题时，说明操作步骤、预期结果和实际结果；提交代码时附上验证命令与结果。请先去掉日志和截图中的密钥、账号信息及用户数据。修改依赖、兼容接口或发行流程的约定统一放在[贡献者指南](CONTRIBUTING.md)，这里不重复展开。

## 发行范围

当前引擎 Tag 流水线配置的构建目标如下；这不是已经公开交付的版本清单：

- Windows x64 与 Windows ARM64 桌面 ZIP；
- Apple Silicon macOS 桌面 ZIP；
- Linux x64 与 Linux ARM64 桌面 ZIP；
- Linux amd64/arm64 无桌面服务器 ZIP；
- Linux amd64/arm64 完整镜像归档（仅作为流水线中间产物存入 OSS）。

GitHub Release 发布桌面包、服务器包和 `install.sh`。Linux 服务器的 `install.sh`、`latest.txt` 与两个架构的版本包同时发布到 OSS 的 `local-engine/` 目录，由 `https://assets.box3.fun/local-engine/` 提供下载。Tag 流水线会校验 Tag 与项目版本及 OSS Secret，但不会替代主分支和 Pull Request 的 `rush verify`；创建 Tag 前必须先完成完整验证。

## 许可与安全

公开仓库中的项目代码按 MIT 提供，欢迎 Fork、修改、商用和再分发，并按协议保留适用版权与许可声明。第三方组件、素材和品牌仍遵循各自许可与使用边界。

引擎和启动器不再进行运行时许可证检测；完成数据配置即可启动服务。管理登录、账户权限和内部接口鉴权仍然保留。
项目代码采用 MIT 开源许可，允许修改、商用和二次分发，使用或分发时须按协议保留版权与许可声明。

协议原文见 [LICENSE.md](LICENSE.md)，发行包内的 [LICENSE.txt](distribution/LICENSE.txt) 与其一致。第三方组件保留各自许可；BOX3 品牌和商标使用不随代码许可授予。许可范围、分发要求与品牌边界见[开源许可说明](docs/open-source-licensing.md)。

不要提交或发布真实 `.env`、数据库连接串、密码、Cookie、Token、用户 IP、地图工程、模型库、备份、日志、Docker 卷或构建缓存。

内部迁移器不在本仓库、公开构建或发行包中。本机可通过 `node scripts/internal-migrator.js dev` 调用仓库外的工具；路径与维护方式见[内部工具接入](docs/internal-tools.md)。
