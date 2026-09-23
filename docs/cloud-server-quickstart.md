# BOX3 Engine 云服务器快速部署

> 适用于 BOX3-Engine-Server 0.1.x 的 Linux amd64/arm64 发行包。

服务器只需要一条安装命令和有效许可证。安装器会自动准备 Docker、下载与 CPU 架构匹配的发行包、校验文件、导入镜像并启动管理端，不需要手改 `.env`、`.runtime.env` 或 Docker Compose。

## 1. 一键安装

使用 root 权限执行稳定安装地址：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh | sudo bash
```

安装目录固定为 `/opt/box3-engine`。重复执行同一条命令可以升级程序和镜像，已有 `.env`、许可证、地图、模型、备份和 Docker 数据卷不会被覆盖。

升级时，安装器只把 `.env` 中由发行版控制的镜像标签和运行平台切换到新版本，其他配置保持不变。更新前正在运行的 Player Service、登录门户、管理端、Creator、Play 和 VOXA 会使用新镜像重建；原本未启动的服务不会被擅自启动。PostgreSQL、Redis、地图文件、玩家数据、许可证及备份不会删除或重建。

安装结束后，管理端默认监听 `0.0.0.0:3130`。安装器会在终端显示局域网地址、公网地址、管理端登录密钥和服主管理密钥，并在已启用的 UFW 或 firewalld 中自动放行 TCP 3130。云厂商安全组仍需由服主放行该端口，外部设备才能打开管理页面。

管理端直接对公网开放时必须保护好登录密钥，并尽快通过 HTTPS 反向代理或 VPN 限制访问。业务服务不会绕过许可证自动启动；服主登录管理端、安装有效许可证并完成数据配置后，再启动游玩端或创作端。

指定版本或自定义安装目录时，先下载安装器再传入环境变量：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh -o install.sh
sudo BOX3_VERSION=0.2.0 BOX3_INSTALL_DIRECTORY=/opt/box3-engine sh install.sh
rm install.sh
```

如果只允许服务器本机通过 SSH 隧道访问管理端，可以使用：

```bash
sudo BOX3_MANAGER_BIND_IP=127.0.0.1 sh install.sh
```

### OSS/CDN 文件结构

把下面三个文件放在同一个 HTTPS 目录：

```text
latest.txt
BOX3-Engine-Server-0.2.0-linux-amd64.zip
BOX3-Engine-Server-0.2.0-linux-arm64.zip
```

`latest.txt` 只写当前版本号，例如：

```text
0.2.0
```

正式下载目录是 `https://assets.box3.fun/local-engine`，因此服主通常不需要指定额外参数。迁移到其他 OSS/CDN 时，可以执行：

```bash
curl -fsSL https://abc.com/install.sh |
  sudo env BOX3_RELEASE_CDN_URL=https://abc.com/box3 sh
```

该目录必须支持 HTTPS 原始文件下载，不能返回登录页面或 HTML 错误页。正式 Release 会自动先上传两个架构包和 `install.sh`，最后更新 `latest.txt`。

CDN 的 `latest.txt` 或当前架构 ZIP 返回错误时，安装器会自动回退到同版本的 GitHub Release；CDN 与 GitHub 都无法下载时才停止安装。

## 2. 准备服务器

完整运行 Play、Creator 和 VOXA，建议至少 8 核 CPU、16 GB 内存和 50 GB 可用磁盘。只运行游玩端时可以适当降低配置。

一键安装器完整支持 Ubuntu 22.04/24.04、Debian 12、Alibaba Cloud Linux 2/3，以及 Docker 官方安装脚本支持的 CentOS、RHEL 和 Rocky Linux。Alibaba Cloud Linux 3 使用 `alinux3-plus`，Alibaba Cloud Linux 2 使用阿里云 Docker CE 镜像仓库，均会安装并验证 Compose v2。

确认服务器架构与下载包一致：

```bash
uname -m
```

`uname -m` 只读取 CPU 架构，不会修改服务器。下载包架构不匹配时，Docker 镜像无法启动。

| 输出              | 发行包后缀    |
| ----------------- | ------------- |
| `x86_64`          | `linux-amd64` |
| `aarch64`/`arm64` | `linux-arm64` |

Ubuntu 安装 Docker：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 unzip ca-certificates
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

这些命令分别用于：

| 命令                         | 作用                                                                |
| ---------------------------- | ------------------------------------------------------------------- |
| `sudo apt update`            | 更新 Ubuntu 软件包索引，不会升级现有软件                            |
| `sudo apt install ...`       | 安装 Docker Engine、Compose v2、ZIP 解压工具和 HTTPS 根证书         |
| `systemctl enable --now ...` | 立即启动 Docker，并让它在服务器重启后自动启动                       |
| `usermod -aG docker ...`     | 将当前用户加入 Docker 用户组，以后执行 `docker` 通常不再需要 `sudo` |

`-y` 表示自动确认安装；`$USER` 是当前登录用户名。用户组变更只对新登录会话生效，因此这组命令完成后要退出 SSH 并重新连接。

退出 SSH 后重新登录，再确认 Docker 可用：

```bash
docker info
docker compose version
```

- `docker info` 检查当前用户能否连接 Docker Engine；如果提示权限不足，通常是尚未重新登录。
- `docker compose version` 检查 Compose v2 插件。输出应以 `Docker Compose version v2` 开头。

## 3. 手动安装服务器包

无法访问 GitHub Release，或需要完全离线部署时，使用本节的手动方式；正常联网服务器直接使用上一节的一键安装命令。

先在自己的电脑上将对应架构的 ZIP 上传到服务器：

```bash
scp BOX3-Engine-Server-<版本>-linux-<架构>.zip <服务器用户>@<服务器地址>:/tmp/
```

`scp` 通过 SSH 传输文件；`<版本>`、`<架构>`、`<服务器用户>` 和 `<服务器地址>` 都需要替换成实际值。例如架构可能是 `amd64`，服务器地址可以是公网 IP。

然后登录服务器并执行：

```bash
sudo mkdir -p /opt/box-engine
sudo chown "$USER":"$USER" /opt/box-engine
unzip /tmp/BOX3-Engine-Server-*.zip -d /opt/box-engine
cd /opt/box-engine/BOX3-Engine-Server-*
chmod +x *.sh
./verify.sh
./install.sh
```

| 命令            | 作用                                                    |
| --------------- | ------------------------------------------------------- |
| `mkdir -p`      | 创建统一的安装目录；目录已存在时不会报错                |
| `chown`         | 将安装目录交给当前用户，后续安装无需一直使用 root       |
| `unzip ... -d`  | 将服务器包解压到安装目录                                |
| `cd`            | 进入解压后的服务器包目录，后续脚本都必须在这里执行      |
| `chmod +x *.sh` | 给安装、校验、日志等脚本增加执行权限                    |
| `./verify.sh`   | 校验发行包清单、文件哈希、镜像归档和 CPU 架构           |
| `./install.sh`  | 导入六个离线镜像、生成初始密钥和配置，并启动 Web 管理端 |

`verify.sh` 必须全部通过。如果失败，不要继续安装，也不要从其他版本复制单个文件补齐。`install.sh` 不会直接启动 Play、Creator 等业务服务，也不会覆盖已经存在的 `.env`。

## 4. 打开 Web 管理端

一键安装模式可以直接打开安装器输出的局域网或公网地址。手动安装模式默认只监听服务器本机的 `127.0.0.1:3130`，需要在自己的电脑执行：

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

这里的 `-L` 会建立一条 SSH 本地端口转发：

```text
你的电脑 127.0.0.1:3130 → SSH 加密连接 → 服务器 127.0.0.1:3130
```

它不会把管理端公开到互联网。执行后终端保持连接属于正常现象；关闭这个 SSH 窗口，浏览器就无法继续访问管理端。

保持 SSH 连接，然后在本机浏览器打开：

```text
http://127.0.0.1:3130
```

登录密钥在服务器安装目录的 `.env` 中：

```bash
sed -n 's/^BOX_SERVER_MANAGER_TOKEN=//p' .env
```

这条命令只读取 `.env` 中的管理令牌，并去掉变量名前缀后显示。它不会修改配置。如果没有输出，请确认当前目录是服务器包安装目录，并执行 `./install.sh` 检查安装是否完成。

不要公开管理密钥、`.env` 或 Docker Socket。一键安装开放 3130 是为了方便首次配置，长期使用应增加 HTTPS、VPN 或来源 IP 白名单。

## 5. 在管理端完成配置

首次部署只需按下面顺序操作：

1. 在“许可证管理”复制设备 ID，并安装为这台服务器签发的许可证。
2. 在“数据配置”选择内置或外部 PostgreSQL；Redis 可以关闭。
3. 在“访问设置”选择本机、局域网或公网，并填写公网 IP 或域名。
4. 保存配置。
5. 在“服务总览”启动游玩端、创作端或全部服务。

访问模式的含义：

| 模式   | 用途                                       | 典型地址              |
| ------ | ------------------------------------------ | --------------------- |
| 本机   | 仅服务器自身访问                           | `127.0.0.1`           |
| 局域网 | 同一内网或 VPN 中的设备访问                | `192.168.x.x`         |
| 公网   | 使用公网 IP 或域名访问，需要同时配置安全组 | `203.0.113.10` 或域名 |

选择“公网”时只填写 IP 或域名，不要填写 `http://`、`https://` 或路径。端口在页面下方的独立输入框设置。

选择内置 PostgreSQL/Redis 时，服务器需要联网下载相应镜像。选择外部数据库时，先在页面中执行连接测试。

管理端会自动维护 `.env` 并生成 `.runtime.env`。不要手工修改 `.runtime.env`，它会在下次保存或启动时被覆盖。

## 6. 验证和导入地图

在服务器查看服务状态：

```bash
./status.sh
./logs.sh server-manager
```

- `status.sh` 显示容器是否正在运行以及健康状态，不会启动或停止服务。
- `logs.sh server-manager` 显示 Web 管理端最近的日志，适合排查管理页面打不开或操作失败。

根据“访问设置”中的地址和端口打开 Play 或 Creator。游玩地图通过 Play 管理页面导入 `.boxplay`；Creator 工程使用 `.boxproject`，两种文件不能混用。

常用命令：

```bash
./status.sh
./logs.sh play
./logs.sh creator
./stop.sh
```

| 命令                | 什么时候使用                                        |
| ------------------- | --------------------------------------------------- |
| `./status.sh`       | 查看当前所有 BOX 服务的运行状态                     |
| `./logs.sh play`    | Play 页面、地图导入或游玩运行异常时查看             |
| `./logs.sh creator` | Creator 页面、工程打开或发布异常时查看              |
| `./stop.sh`         | 停止 BOX 服务；不会删除地图、工程、许可证或数据库卷 |

## 7. 公网访问

不使用域名或反向代理时，可以直接使用“公网 IP + 端口”：

```text
http://<公网IP>:<Play端口>
http://<公网IP>:<登录页面端口>
```

只需在云服务器安全组中放行实际使用的端口。不要对公网开放 Web 管理端、Docker Socket、PostgreSQL、Redis 或 Player Service 管理接口。

常见端口如下，实际值以管理端页面为准：

| 端口   | 服务       | 是否建议公网开放                                 |
| ------ | ---------- | ------------------------------------------------ |
| `3121` | Play       | 需要玩家访问时开放                               |
| `3125` | 登录页面   | 使用内置登录门户时开放                           |
| `3127` | Creator    | 默认不开放；远程创作时优先使用 VPN               |
| `3123` | VOXA       | 默认不开放；只允许可信创作者访问                 |
| `3124` | 玩家服务   | 不直接开放管理接口                               |
| `3130` | Web 管理端 | 一键安装时开放；长期使用 HTTPS、VPN 或 IP 白名单 |
| `5432` | PostgreSQL | 不开放                                           |
| `6379` | Redis      | 不开放                                           |

“安全组放行”只允许网络流量到达服务器，不会自动启动对应服务。修改安全组后仍要确认管理端中的服务已经启动，并检查服务器自身防火墙规则。

需要 HTTPS、标准的 443 端口或不带端口的域名时，再配置反向代理。多个应用不要依赖 Referer 共用 `/_next` 和 `/api` 路径；推荐为 Play、登录门户和远程 Creator 使用不同子域名。具体要求见[部署与联机](./deployment.md)。

Creator 和 VOXA 默认应只允许本机、内网或 VPN 中的可信创作者访问。

## 8. 备份和升级

通过管理端备份 Creator 工程和 Play 地图，并单独备份 PostgreSQL。升级前至少保存：

- `.env` 和 `license/`；
- Creator 工程、Play 地图和 VOXA 模型目录；
- PostgreSQL 的 `pg_dump` 或数据库服务商快照。

升级时使用完整的新服务器包，执行新包的 `verify.sh` 和 `install.sh`。不要混用不同版本的 Compose 文件、镜像归档和校验清单。

更多故障排查和数据迁移说明见 [Linux Web 管理端](./linux-web-manager.md) 与[配置参考](./configuration-reference.md)。

## 不再需要的旧操作

正常部署不需要执行以下操作：

- 同时手改 `.env` 和 `.runtime.env`；
- 用 Compose override 替换许可证设备 ID；
- 绕过管理端直接运行 `docker compose up`；
- 使用 Referer 分流多个应用的 `/_next`、`/api`；
- 使用 Token 和 `curl` 手工导入地图；
- 为正常发行的 `.boxplay` 重新打包 tar 头。

这些做法会绕过管理器的校验或造成配置在下次保存时被覆盖。遇到旧包或许可证迁移问题时，应先升级服务器包或重新签发许可证。
