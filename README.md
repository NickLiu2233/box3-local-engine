<div align="center">

<img src="apps/deployment-manager/src-tauri/icons/box3-engine.png" alt="BOX3 本地引擎图标" width="128" />

# BOX3 本地引擎

[![Node.js](https://img.shields.io/badge/Node.js-22.17-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.1-61DAFB.svg)](https://react.dev/)
[![Rush](https://img.shields.io/badge/Rush-5.156.0-2B4F81.svg)](https://rushjs.io/)
[![Rust](https://img.shields.io/badge/Rust-000000.svg)](https://www.rust-lang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)

**网页多人 3D 创作与游玩，自主部署与管理**

</div>

## 引擎介绍

BOX3 是基于网页的多人 3D 创作与游玩工具。创作者使用 Creator 和 Arena 制作地图、用 VOXA 编辑模型，再发布给玩家通过浏览器游玩。

本地引擎将创作、游玩和管理服务部署在自己的电脑或 Linux 服务器上，由服主管理地图、玩家、访问范围和数据。

<table>
  <tr>
    <td width="50%"><img src="assets/readme/riverside-street.png" alt="BOX3 作品：水岸街区" /></td>
    <td width="50%"><img src="assets/readme/arena.png" alt="BOX3 作品：竞技场" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/readme/ancient-town.png" alt="BOX3 作品：古镇与楼塔" /></td>
    <td width="50%"><img src="assets/readme/voxel-city.png" alt="BOX3 作品：体素城市" /></td>
  </tr>
</table>

## 选择适合自己的入口

| 你的目标                      | 建议入口       | 需要了解的内容                                  |
| ----------------------------- | -------------- | ----------------------------------------------- |
| 连接已有服务器游玩            | 玩家启动器     | 添加服务器、登录账号、选择地图；不需要克隆源码  |
| 在自己电脑上创作或开服        | 部署管理器     | 配置基础服务、启动 Creator/Play、管理与备份数据 |
| 在无桌面的 Linux 服务器上开服 | Linux 服务器包 | Docker Engine、Compose、访问地址与防火墙        |
| 修改引擎、编辑器或管理工具    | 本仓库源码     | Node.js、Rush 工作区、开发栈与验证流程          |

安装包从 [GitHub Releases](https://github.com/box3lab/box-local-engine/releases) 获取。部署步骤分别见[部署管理器说明](apps/deployment-manager/README.md)和[Linux 服务器说明](distribution/server/README.md)，玩家操作见[玩家启动器说明](apps/player-launcher/README.md)。安装包的操作系统与服务器镜像的架构是两个概念：桌面应用运行在用户电脑上，服务镜像运行在 Docker 的 Linux 环境中。

## 服务如何配合

Creator 负责编辑与预览，VOXA 负责模型、皮肤和动画，Play 负责运行发布后的地图。Player Service 为它们提供统一玩家身份与管理接口；登录门户提供登录/注册页面，玩家后台用于管理玩家和游玩地图。部署管理器负责启动、配置与维护这些服务，玩家启动器则连接服务进行游玩。

作品有两种交付格式：`.boxproject` 保留可编辑工程，适合作者备份与协作；`.boxplay` 是发布后的地图组快照，适合交给服主导入 Play。开发源码、安装包和作品数据分别管理，更新引擎不会替代作品导出与备份。格式与数据位置见[本地引擎说明](apps/local-engine/README.md)。

## 从源码快速开始

需要 Node.js `22.17.x`、Docker Compose v2。仓库脚本自动准备锁定版本的 Rush 和 pnpm；原生管理器构建和完整验证还需要 Rust stable 与对应平台工具链。

```sh
git clone https://github.com/box3lab/box-local-engine.git
cd box-local-engine
npm run install:all
cp .env.docker.example .env
npm run check:workspace
npm run dev:infra
```

以上命令在仓库根目录执行；`cp` 仅用于首次初始化，Windows PowerShell 可用 `Copy-Item .env.docker.example .env`。先启动 Docker，再运行开发命令。首次安装和构建需要联网，开发脚本会先构建公共依赖，再启动网页服务以及本机 PostgreSQL/Redis。等待日志显示服务已就绪后再打开地址。

已有 PostgreSQL 时，配置本地 `.env` 后使用 `npm run dev`。PostgreSQL 必需，Redis 可选；不要覆盖已有配置或提交凭据。

| 服务           | 默认开发地址           |
| -------------- | ---------------------- |
| Creator        | http://127.0.0.1:3127/ |
| Play           | http://127.0.0.1:3121/ |
| VOXA           | http://127.0.0.1:3123/ |
| Player Service | http://127.0.0.1:3124/ |
| 登录门户       | http://127.0.0.1:3125/ |
| 玩家后台       | http://127.0.0.1:8000/ |

建议先打开登录门户创建测试账号，再打开 Creator 进行创作；需要管理权限的操作仍受服务端授权控制，注册账号不等于获得服主管理权限。完整配置、停止服务和排障步骤见[开发入门](docs/developer-guide.md)。

玩家后台默认随开发栈启动，发行版构建进 Player Service。玩家启动器负责连接服务器，部署管理器负责部署和维护服务，两者是不同应用。

## 项目结构

本仓库使用 Rush 管理多个相互依赖的项目。根目录的 `npm run …` 是统一入口，不代表所有应用都在根目录构建。

| 目录                                                                      | 职责                           | 常见修改场景                   |
| ------------------------------------------------------------------------- | ------------------------------ | ------------------------------ |
| `apps/game/`、`apps/voxa/`                                                | 创作、游玩界面与模型编辑器     | 编辑器操作、网页渲染、模型工具 |
| `apps/local-engine/`                                                      | 本地工程、地图发布与运行时启动 | 工程导入导出、地图组、生命周期 |
| `apps/player-admin/`、`apps/player-auth-portal/`                          | 玩家后台与登录门户             | 玩家管理、登录与注册           |
| `apps/deployment-manager/`、`apps/player-launcher/`                       | 部署管理器与玩家启动器         | 桌面交互、安装与连接服务器     |
| `apps/manager-core/`、`apps/server-manager/`、`apps/server-manager-rust/` | 部署管理共享能力与服务器管理端 | 容器管理、服务器运维           |
| `services/game-server/`                                                   | 权威游戏服务与脚本运行时       | 游戏状态同步、脚本执行与权限   |
| `packages/`、`internals/`                                                 | 共享模块、API 契约与内部依赖   | 跨应用复用、公共接口           |
| `scripts/`、`common/`                                                     | 仓库工具、Rush 配置与锁文件    | 质量检查、依赖与构建流程       |
| `distribution/`、`docs/`                                                  | 发行模板与基础文档             | 安装入口、开发与贡献说明       |

## 开发与贡献

入门命令见[开发入门](docs/developer-guide.md)，编码约定见[代码规范](docs/code-style.md)，Fork 与提交流程见[贡献指南](CONTRIBUTING.md)。API 文档可通过 `npm run api:docs` 启动。

提交前运行 `npm run verify`。源码开发不会自动更新已有容器或安装包；部署使用 [GitHub Releases](https://github.com/box3lab/box-local-engine/releases) 中的产物。

开发 PR 运行质量检查，staging 用于测试打包，release 的已合并 PR 用于正式发布。同版本 staging 默认复用已有镜像，修改源码后需要升级版本或显式强制重建才能验证新镜像。分支、OSS 路径和版本约定见 [Release & Version](docs/release-and-version.md)。

不要公开数据库、Docker Socket 或管理端，不要提交密钥、用户数据、地图与备份。权限判定和权威数据必须留在服务端，不能依赖客户端隐藏按钮。

问题反馈与讨论见 [Issues](https://github.com/box3lab/box-local-engine/issues)。第三方组件保留各自许可，项目品牌与商标不由 MIT 授权。
