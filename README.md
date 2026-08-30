# BOX3 Engine

BOX3 Engine 是一个本地优先的体素游戏引擎发行版，提供地图创作、模型编辑、只读地图发布、多人游玩、玩家身份管理和图形化 Docker 部署。运行所需的引擎资源与 8 套预置玩家皮肤均保存在仓库和离线镜像中；正常创作与游玩不依赖 BOX3 云端资源服务。

当前版本为 `0.1.0`，发行包用于内部测试。Windows 与 macOS 构建尚未接入正式代码签名；公开分发前仍需完成 Authenticode、Apple Developer ID 和 macOS 公证。

## 从这里开始

| 你的目标                                | 文档                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| 使用 Windows、macOS 或 Linux 桌面启动器 | [图形化部署管理器](docs/graphical-deployment-manager.md) |
| 部署无图形 Linux 游玩服务器             | [安装、部署与运维](docs/installation-and-operations.md)  |
| 创建、导入、编辑和发布地图              | [地图作品、地图组与发布包](docs/projects.md)             |
| 配置端口、数据库、容量与安全项          | [配置参考](docs/configuration-reference.md)              |
| 开发或调试本仓库                        | [开发者与协作手册](docs/developer-guide.md)              |
| 构建镜像、App 或 GitHub Release         | [构建、分发与 CI](docs/release-and-distribution.md)      |
| 浏览全部专题                            | [文档中心](docs/README.md)                               |

## 当前组成

桌面离线包包含五个 Linux 容器镜像。下表地址同时是当前启动器模板与仓库 Compose 的默认值；
服主在启动器中修改端口后，应以启动器“服务总览”显示的地址为准。

| 服务               | 职责                           | 默认地址                 | 网络边界                |
| ------------------ | ------------------------------ | ------------------------ | ----------------------- |
| Creator            | 地图作品管理、编辑、预览和发布 | `http://127.0.0.1:3002/` | 仅本机或可信局域网      |
| Play               | 地图大厅和已发布地图运行       | `http://127.0.0.1:3000/` | 可经 HTTPS 反向代理公开 |
| VOXA               | 模型、皮肤和动画编辑           | `http://127.0.0.1:3001/` | 仅本机或可信局域网      |
| Player Service     | 玩家账号、会话、玩家管理与审计 | `http://127.0.0.1:3213/` | 玩家管理页不应直接公开  |
| Player Auth Portal | 参考登录/注册门户              | `http://127.0.0.1:3214/` | 可替换为服主自己的门户  |

Tauri 启动器位于 `apps/deployment-manager/`，负责导入镜像、保存配置、启动/停止容器、显示实时进度与日志，以及管理本地备份。关闭启动器窗口不会停止已经运行的容器。

`apps/migrator/` 是仓库内部使用的云端工程迁移工具，不属于桌面离线包、无图形服务器包或普通服主的部署流程。它需要访问迁移来源，不能作为核心引擎“完全离线运行”的依据。

## 关键数据边界

- Creator 保存可编辑 `.boxproject` 工程；发布会生成不可变 `.boxplay` 地图组游玩包。
- 一个地图组由一个主地图和零到多个副地图组成；成员地形和实体相互独立，共享地图组资源与组数据空间。
- Play 只导入并运行 `.boxplay` 快照，不读取 Creator 的 `source/` 工程，也不能修改封面、标题、简介或作者。
- Player Service 使用 PostgreSQL 保存账号、会话、封禁、后台管理员和审计数据；普通玩家账号与玩家管理后台账号完全分离。
- 普通玩家同一时间只保留一个设备会话；后台管理员使用独立会话。服主只能用 `BOX_PLAY_ADMIN_TOKEN` 兑换临时服主会话，不能把服主身份分配给账号。
- Redis 是可选缓存，不是账号、地图脚本数据或权限状态的正确性来源。

## 脚本与安全边界

- 服务端地图脚本在 game-server 的隔离运行时中执行，并受脚本内存和运行时生命周期限制；需要保密、判定胜负、发放奖励或写入权威存档的逻辑必须放在服务端。
- 客户端地图脚本运行在玩家浏览器页面中。编辑器同时提供引擎 API 与常用浏览器能力的类型声明，但类型声明只影响补全和类型提示，不会形成运行时沙箱，也不能阻止玩家查看或篡改客户端代码。
- 客户端脚本、地图资源和可下载的发布包都属于不可信内容，不能包含密码、Cookie、数据库连接串、API Key、服主密钥或只靠隐藏即可保护的规则。
- 引擎的 URL 接口允许任意有效的绝对 HTTP(S) 地址，不使用 BOX 平台域名白名单；仍拒绝脚本协议、文件协议、控制字符和带 URL 凭据的地址。登录 Origin、登录回跳地址和资源 CORS 是独立的服务安全边界，不属于资源域名白名单。

## 快速开始

开发环境要求：Node.js `22.17.0`、pnpm `10.12.1`、Docker Compose v2。构建桌面 App 另需 Rust stable 和对应平台的原生工具链。

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.docker.example .env
pnpm verify
```

常用命令：

| 命令                      | 作用                                |
| ------------------------- | ----------------------------------- |
| `pnpm dev`                | 启动 Creator 源码开发运行时         |
| `pnpm creator`            | 构建/启动 Creator 容器              |
| `pnpm play`               | 构建/启动 Play 容器                 |
| `pnpm voxa`               | 构建/启动 VOXA 容器                 |
| `pnpm player-service`     | 构建/启动 Player Service            |
| `pnpm player-auth-portal` | 构建/启动参考登录门户               |
| `pnpm stop`               | 停止本仓库 Compose 服务，不删除数据 |
| `pnpm verify`             | 运行格式、lint、类型检查和全部回归  |

首次部署至少需要设置三个互不相同的随机密钥，并配置 PostgreSQL：

```env
PERMISSION_TOKEN_SECRET=
BOX_PLAYER_AUTH_API_KEY=
BOX_PLAY_ADMIN_TOKEN=
BOX_DATABASE_URL=
```

可以使用 `openssl rand -hex 32` 生成密钥。不要提交 `.env`，也不要把密钥放入浏览器 JavaScript、地图脚本、截图或日志。

## 仓库结构

| 路径                           | 职责                                         |
| ------------------------------ | -------------------------------------------- |
| `apps/game/`                   | Creator / Play 页面、客户端引擎与玩家管理 UI |
| `apps/local-engine/src/`       | 项目、地图组、发布包和运行时生命周期         |
| `services/game-server/src/`    | 权威游戏运行时、脚本、存储和玩家身份         |
| `apps/voxa/`                   | 本地模型、皮肤和动画编辑器                   |
| `examples/player-auth-portal/` | 独立参考登录门户                             |
| `apps/deployment-manager/`     | Vite + Tauri 图形化启动器                    |
| `apps/migrator/`               | 内部迁移工具，不进入用户发行包               |
| `scripts/`                     | 回归、发行、离线包和文档检查                 |
| `distribution/`                | 许可证、无图形服务器和维护者部署模板         |

地图 UUID、地图组关系、资源 hash、脚本 API、发布清单和 MuDB 协议均属于兼容接口。修改相关代码前先阅读[系统架构](docs/architecture.md)和[与 boxes 的核心对齐基线](docs/boxes-parity.md)。

## 发行范围

推送 `v*` Tag 会执行 `pnpm verify`，分别构建 `linux/amd64` 与 `linux/arm64` 的五服务镜像，再生成：

- Windows x64 桌面离线 ZIP；
- Apple Silicon macOS 桌面离线 ZIP；
- Linux x64 桌面离线 ZIP；
- Linux amd64 / arm64 无图形游玩服务器 ZIP；
- Linux amd64 / arm64 五服务镜像归档。

无图形服务器包只包含 Play、Player Service 和参考登录门户，不包含 Creator、VOXA 或内部迁移器。普通桌面用户只需下载与操作系统和 CPU 匹配的一个 ZIP；不需要另行下载镜像归档。

## 许可与安全

仓库 npm 元数据为 `UNLICENSED`，不授予源代码开源许可。用户发行包适用 [BOX3 Engine 非商业本地部署最终用户许可协议](distribution/LICENSE.txt)。商业使用、二次开发、再分发或品牌合作必须取得权利人书面授权。

不要提交或分发真实 `.env`、数据库连接串、密码、Cookie、Token、用户 IP、项目、地图包、模型库、备份、日志、Docker 卷或构建缓存。
