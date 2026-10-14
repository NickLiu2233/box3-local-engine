<div align="center">

<img src="apps/deployment-manager/src-tauri/icons/icon.png" alt="BOX3 本地引擎图标" width="128" />

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

BOX3 本地引擎把地图创作、模型编辑、多人游玩和服务器管理部署在自己的电脑或 Linux 服务器上。创作者使用 ARENA 制作地图、用 VOXA 编辑模型，再发布给玩家通过浏览器游玩。

<table align="center" cellspacing="12" cellpadding="0">
  <tr>
    <td><img src="assets/readme/riverside-street.png" alt="BOX3 作品：水岸街区" width="560" /></td>
    <td><img src="assets/readme/arena.png" alt="BOX3 作品：竞技场" width="560" /></td>
  </tr>
  <tr>
    <td><img src="assets/readme/ancient-town.png" alt="BOX3 作品：古镇与楼塔" width="560" /></td>
    <td><img src="assets/readme/voxel-city.png" alt="BOX3 作品：体素城市" width="560" /></td>
  </tr>
</table>

## 安装与使用

### 在电脑上安装桌面启动器

先安装并启动 Docker，再下载启动器：Windows、macOS 请安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)；Linux 请安装并启动 Docker Engine。Windows 还需要启用 CPU 虚拟化并安装 WSL 2。建议电脑有 4 核 CPU、8 GB 内存和 30 GB 可用磁盘空间；Docker 镜像、地图和数据库会继续占用磁盘空间。

前往 [GitHub Releases](https://github.com/box3lab/box-local-engine/releases) 下载最新版本，再按系统和处理器选择对应 ZIP：Windows x64/ARM64、macOS Apple 芯片（ARM64）、Linux x64/ARM64。

将 ZIP 完整解压到本地目录，再打开 BOX3 Engine Launcher。首次启动时保持 Docker 运行，并按界面提示配置服务；需要的服务镜像会在启动时下载。

安装后请阅读[首次启动指南](https://docs.box3lab.com/local-engine/getting-started/first-start.html)。遇到问题可加入 QQ 群「Box3Local秘密基地」交流：[1107448537](https://qm.qq.com/q/yV2NR8skec)。

### 在 Linux 服务器上安装

适用于无桌面 Linux 服务器，支持 AMD64 和 ARM64。推荐 Ubuntu 24/26 或 Alibaba Cloud Linux 3/4。联网安装器会准备 Docker Engine 和 Compose v2，下载并校验发行包，然后启动 Web 管理器。

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh | sudo bash
```

安装完成后保存终端显示的管理地址和两种密钥：

| 密钥                       | 用途                          |
| -------------------------- | ----------------------------- |
| `BOX_SERVER_MANAGER_TOKEN` | 登录 Linux Web 管理器         |
| `BOX_PLAY_ADMIN_TOKEN`     | 以 owner 身份登录玩家管理后台 |

两种密钥不可互换，也不要发到公开聊天、截图或日志中。管理端口默认为 TCP `3130`；需要从其他电脑访问时，在云安全组和系统防火墙放行该端口。登录 Web 管理器后，按[首次启动指南](https://docs.box3lab.com/local-engine/getting-started/first-start.html)配置数据库、访问范围并启动业务服务。

安装器默认让管理端可从网络访问，建议通过 HTTPS 反向代理、VPN 或来源 IP 白名单保护管理入口。只允许本机访问时，可用回环地址安装，并通过 SSH 隧道登录：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh -o install.sh
sudo BOX3_MANAGER_BIND_IP=127.0.0.1 sh install.sh
```

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

保持 SSH 连接，在本机浏览器打开 `http://127.0.0.1:3130`。服务器包的完整说明、日常运维和排障步骤见 [Linux 服务器安装指南](distribution/server/README.md)。

日常运维命令：

```bash
cd /opt/box3-engine
./status.sh       # 查看状态
./start.sh        # 启动 Web 管理器
./logs.sh play    # 查看 Play 日志
./stop.sh         # 停止服务，不删除数据
```

## 服务与作品

- **Creator**：创建、编辑和预览地图。
- **VOXA**：编辑模型、皮肤和动画。
- **Play**：运行已发布的地图，供玩家通过浏览器游玩。
- **Player Service 与玩家后台**：管理玩家身份、账号和游玩地图。
- **玩家登录门户**：可定制登录、注册、退出和账号设置页面。可从 [BOX3 玩家登录门户模板](https://github.com/box3lab/box3-engine-player-auth-template) 开始；门户需要在部署管理器中配置并连接 Player Service，不能脱离本地引擎独立提供账号功能。
- **部署管理器**：配置、启动和维护本地服务。
- **玩家启动器**：连接已有服务器并游玩，不负责部署服务器。

`.boxproject` 是可编辑工程，适合备份和协作；`.boxplay` 是发布后的地图快照，适合导入 Play。更新引擎不会替代作品导出和数据备份，数据位置与格式见[本地引擎说明](apps/local-engine/README.md)。

## 从源码开发

修改源码需要 Node.js `22.17.x` 和 Docker Compose v2。仓库脚本会准备锁定版本的 Rush 和 pnpm；原生管理器构建与完整验证还需要 Rust stable 和对应平台工具链。

```sh
git clone https://github.com/box3lab/box-local-engine.git
cd box-local-engine
npm run install:all
cp .env.docker.example .env
npm run check:workspace
npm run dev:infra
```

开发服务默认地址、数据库设置、命令说明和故障排查见[开发入门](docs/developer-guide.md)；代码约定见[代码规范](docs/code-style.md)。

## 项目来源与许可证

本项目基于 BOX3 UGC 平台的引擎研发基础拆分整理。平台（内部称为 `boxs`）不是本仓库的开源依赖，也不属于本仓库的发行内容；本项目聚焦本地创作、游玩、部署和服务管理。

本仓库采用 [MIT License](LICENSE.md)。第三方组件、字体、图片、模型和其他资源可能受各自许可约束，不会仅因存放在本仓库中就自动获得 MIT 授权。BOX3 名称、品牌、图标及相关商标也不包含在 MIT 授权内。

## 参与贡献

源码贡献流程、Fork 与分支、验证要求和 Pull Request 说明见[贡献指南](CONTRIBUTING.md)。提交前运行 `npm run verify`。

问题反馈与讨论见 [GitHub Issues](https://github.com/box3lab/box-local-engine/issues)。

## 致谢

感谢曾经在深圳奇梦岛科技有限公司参与 BOX3 引擎研发、设计、测试、运营和基础设施建设的每一位伙伴，让今天这个 BOX3 本地引擎成为可能。
