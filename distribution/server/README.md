# BOX3 Engine 无图形 Linux 服务器离线包

此包用于没有桌面环境的 Linux 游玩服务器。它包含浏览器 Web 管理控制台、可由服主管理的 Compose 配置、`.env.example` 和运维脚本，以及对应 CPU 架构的 Play、Player Service 和参考登录门户镜像。

它不会包含真实 `.env`、数据库密码、服主密钥、地图、模型、玩家数据、备份或浏览器登录信息。

## 第一次启动

1. 安装 Docker Engine 和 Docker Compose v2。
2. 完整解压本 ZIP，进入解压目录。
3. 执行 `chmod +x *.sh`。
4. 执行 `./install.sh`。首次执行会由 `.env.example` 创建 `.env`，并自动生成服务密钥与独立的 Web 管理令牌。
5. 使用 SSH 隧道转发管理端口：`ssh -L 3130:127.0.0.1:3130 user@服务器地址`。
6. 在自己电脑打开 `http://127.0.0.1:3130`，使用 `.env` 中的 `BOX_SERVER_MANAGER_TOKEN` 登录并填写 PostgreSQL、访问地址、端口及容量配置。
7. 保存配置后，在 Web 管理控制台重启游玩服务。

`install.sh` 只导入包内四个游玩体系镜像和启动服务，绝不会安装 PostgreSQL 或 Redis，也不会覆盖已经存在的 `.env`。服务器 Compose 中同样没有 Creator、VOXA、迁移器或本地 PostgreSQL/Redis 服务定义。

## 日常运维

- `./status.sh`：查看服务状态。
- `./logs.sh [服务名]`：实时查看日志，例如 `./logs.sh play`。
- `./stop.sh`：停止服务，不删除项目、地图、模型、备份或 Docker 数据卷。

日常配置、状态、启停与日志优先使用 Web 管理控制台；这些脚本保留为故障恢复入口。Web 控制台只接受固定的 Play、Player Service 和登录门户操作，不能执行任意宿主机命令。

## 网络边界

管理端默认通过 `BOX_SERVER_MANAGER_BIND_IP=127.0.0.1` 只监听宿主机回环地址。不要把 3130 端口直接暴露到公网；使用 SSH 隧道，或在明确配置 HTTPS、访问控制和防火墙后再远程访问。

在 Web 控制台或 `.env` 中配置游玩地址、端口和 `BOX_BIND_IP`。公网仅应开放 Play、Player Service 与服主自建登录门户，并通过 HTTPS 反向代理和防火墙保护。此包不含 Creator / ARENA 或 VOXA，不能用于地图编辑。

详细变量说明与反向代理要求见仓库文档的“配置参考”和“安装、部署与运维”。不要分享最终生成的 `.env`。

## 小内存服务器

默认 `.env.example` 为 Web 管理模块设置 `128m` 容器内存和 `96 MB` Node 堆，为 Player Service 设置 `256m` 容器内存和 `192 MB` Node 堆，为参考登录门户设置 `64m` 与 `48 MB` Node 堆，把更多资源留给 Play。若服主已有自己的登录页，可从 `COMPOSE_PROFILES` 删除 `auth-portal`，该参考门户不会启动。
