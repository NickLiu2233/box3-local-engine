# BOX3 Engine 无图形 Linux 服务器离线包

此包用于没有桌面环境的 Linux 服务器。它包含由 Rust 提供 HTTP API 的浏览器 Web 管理控制台、可由服主管理的 Compose 配置、`.env.example` 和运维脚本，以及对应 CPU 架构的 Creator、VOXA、Play、Player Service 和参考登录门户镜像。管理页面与桌面启动器复用同一套前端和命令名称；差异仅在浏览器通过 HTTP 调用 Rust 服务。

它不会包含真实 `.env`、数据库密码、服主密钥、地图、模型、玩家数据、备份或浏览器登录信息。

## 第一次启动

1. 安装 Docker Engine 和 Docker Compose v2。
2. 完整解压本 ZIP，进入解压目录。
3. 执行 `chmod +x *.sh`，再执行 `./verify.sh` 校验完整性；`BOX3-OFFLINE-IMAGE.json` 记录版本、CPU 架构、镜像标签和镜像归档 SHA-256。
4. 执行 `./install.sh`。安装器会再次校验归档和六个镜像的 CPU 架构；首次执行会由 `.env.example` 创建 `.env`，并自动生成服务密钥与独立的 Web 管理令牌。
5. 使用 SSH 隧道转发管理端口：`ssh -L 3130:127.0.0.1:3130 user@服务器地址`。
6. 在自己电脑打开 `http://127.0.0.1:3130`，使用 `.env` 中的 `BOX_SERVER_MANAGER_TOKEN` 登录。
7. 在“许可证管理”复制设备 ID，取得并安装有效许可证，再填写 PostgreSQL、访问地址、端口及容量配置。
8. 保存配置后，在 Web 管理控制台启动相应服务；“数据与备份”页面可上传、下载、创建、恢复或删除 `.tar.gz` 工程备份。恢复会先停止业务服务。

`install.sh` 会校验 CPU 架构、导入包内完整的六个服务镜像并启动 Web 管理端；业务服务必须在许可证安装后由服主启动。安装脚本不会覆盖已经存在的 `.env`。服务器 Compose 不包含迁移器，但包含可选的内置 PostgreSQL/Redis 定义；只有在 Web 管理端选择“内置”时才会拉取并启动对应基础服务镜像。

## 日常运维

- `./status.sh`：查看服务状态。
- `./logs.sh [服务名]`：实时查看日志，例如 `./logs.sh play`。
- `./stop.sh`：停止服务，不删除项目、地图、模型、备份或 Docker 数据卷。

日常配置、状态、启停与日志优先使用 Web 管理控制台；这些脚本保留为故障恢复入口。Web 控制台只接受固定的 Creator、VOXA、Play、Player Service、登录门户和内置 PostgreSQL/Redis 操作，不能执行任意宿主机命令。

## 网络边界

管理端默认通过 `BOX_SERVER_MANAGER_BIND_IP=127.0.0.1` 只监听宿主机回环地址。不要把 3130 端口直接暴露到公网；使用 SSH 隧道，或在明确配置 HTTPS、访问控制和防火墙后再远程访问。

在 Web 控制台或 `.env` 中配置游玩和创作端的地址、端口与监听范围。公网仅应开放确有需要的服务，并通过 HTTPS 反向代理和防火墙保护。Creator / ARENA 和 VOXA 默认只监听本机；若要让远程创作者访问，请同步调整公开地址、允许来源和访问控制。

详细变量说明与反向代理要求见仓库文档的“配置参考”和“安装、部署与运维”。不要分享最终生成的 `.env`。

## 小内存服务器

默认 `.env.example` 为 Rust Web 管理模块设置 `128m` 容器内存；它不运行 Node.js。Player Service 默认使用 `256m` 容器内存和 `192 MB` Node 堆，参考登录门户使用 `64m` 与 `48 MB` Node 堆，把更多资源留给 Play。若服主已有自己的登录页，可从 `COMPOSE_PROFILES` 删除 `auth-portal`，该参考门户不会启动。
