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
| 玩家账号、权限组和后台管理       | [玩家身份与管理后台](docs/player-identity.md)            |
| 配置端口、数据库和资源限制       | [配置参考](docs/configuration-reference.md)              |
| 开发、测试或提交代码             | [贡献者指南](CONTRIBUTING.md)                            |
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
| Player Service     | 玩家登录、玩家管理后台、权限和审计     | `http://127.0.0.1:3124/` |
| Player Auth Portal | 可替换的参考登录/注册门户              | `http://127.0.0.1:3125/` |
| Server Manager     | Linux 无桌面环境的 Web 管理端          | `http://127.0.0.1:3130/` |

桌面版本使用 Tauri 启动器管理前五个业务服务；Linux 服务器版本使用 Server Manager 提供同一套配置和运维能力。完整离线镜像归档包含以上六个镜像。无桌面服务器包包含 Creator、VOXA、Play、Player Service、参考登录门户和 Server Manager。关闭桌面启动器窗口不会停止已经运行的容器。

玩家管理后台由 Player Service 在根路径提供，当前主要功能包括：

- 玩家账号、会话、标签、备注、封禁、密码重置和 CSV 导出；
- 独立后台账号、权限组、查看/编辑能力和安全审计；
- Creator 访问权限与一次性展示的 CLI Token；
- `.boxplay` 地图包预览、导入、开放、关闭和删除；
- 创作端/游玩端运行时、地图容器配置及资源组；
- 独立 Docker 地图容器的 CPU、内存、进程、网络和出网带宽限制。

Play 游戏内不再提供旧的“服主管理”。地图导入和日常管理统一在玩家管理后台的“游玩管理”中完成。

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
npm install --global @microsoft/rush@5.156.0
rush install
cp .env.docker.example .env
```

启动完整源码开发栈：

```bash
rush dev
```

`rush dev` 直接运行 Creator、Play、VOXA、Player Service 和参考登录门户源码，默认连接 `.env` 中已有的 PostgreSQL/Redis。没有可用基础服务时使用：

```bash
rush dev --infra
```

只启动 Creator 相关开发服务：

```bash
rush dev-creator
```

常用命令：

| 命令                                        | 作用                                   |
| ------------------------------------------- | -------------------------------------- |
| `rush dev`                                  | 启动完整源码开发栈                     |
| `rush dev --infra`                          | 启动开发栈并启动开发 PostgreSQL/Redis  |
| `rush dev-creator`                          | 启动 Creator 相关开发服务              |
| `rush build --to <项目名>`                  | 按依赖顺序增量构建指定项目             |
| `rush package-images --architecture <架构>` | 构建六个 Linux 镜像并导出归档          |
| `rush export-images`                        | 不重建，导出本机已有的完整镜像集合     |
| `rush package-desktop --target <目标>`      | 生成目标平台桌面离线包                 |
| `rush package-web --architecture <架构>`    | 生成 Linux 无桌面服务器包              |
| `rush verify`                               | 执行格式、Lint、类型检查和全部回归测试 |

根 `package.json` 同时提供便于发现的 npm 别名，例如 `npm run dev`、`npm run verify`、`npm run package:images:arm64`、`npm run package:desktop:macos-arm64` 和 `npm run package:web:amd64`。需要自定义参数时，可在 `--` 后继续传给 Rush：

```bash
npm run build -- --to @box-local/player-admin
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

## 仓库结构

| 路径                           | 职责                                           |
| ------------------------------ | ---------------------------------------------- |
| `apps/game/`                   | Creator、Play、Player Service 页面与引擎客户端 |
| `apps/player-admin/`           | 玩家管理后台 Umi 前端                          |
| `apps/local-engine/src/`       | 工程、地图组、发布包和运行时生命周期           |
| `services/game-server/src/`    | 权威游戏运行时、脚本和数据存储                 |
| `apps/voxa/`                   | VOXA 模型、皮肤和动画编辑器                    |
| `apps/deployment-manager/`     | Vite + Tauri 桌面启动器                        |
| `apps/manager-core/`           | 桌面端和服务器管理端共用 Rust 业务核心         |
| `apps/server-manager-rust/`    | Linux Web 管理服务                             |
| `examples/player-auth-portal/` | 参考登录/注册门户                              |
| `apps/migrator/`               | 内部迁移工具，不进入普通用户发行包             |
| `distribution/`                | 服务器包、独立部署和许可模板                   |
| `scripts/`                     | 开发、回归、打包和文档检查脚本                 |

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
