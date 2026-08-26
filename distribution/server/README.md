# BOX3 Engine 无图形 Linux 服务器离线包

此包用于没有桌面环境的 Linux 服务器。它包含可由服主管理的 Compose 配置、`.env.example` 和运维脚本，以及对应 CPU 架构的五项 BOX3 Engine 服务镜像。

它不会包含真实 `.env`、数据库密码、服主密钥、地图、模型、玩家数据、备份或浏览器登录信息。

## 第一次启动

1. 安装 Docker Engine 和 Docker Compose v2。
2. 完整解压本 ZIP，进入解压目录。
3. 执行 `chmod +x *.sh`。
4. 执行 `./install.sh`。首次执行会由 `.env.example` 创建 `.env`；如果安装了 OpenSSL，会自动生成三项随机密钥。
5. 打开 `.env`，填写 PostgreSQL、Redis（可选）、访问地址和端口，然后再次执行 `./install.sh`。

`install.sh` 只导入包内镜像和启动服务，绝不会安装 PostgreSQL 或 Redis，也不会覆盖已经存在的 `.env`。

## 日常运维

- `./status.sh`：查看服务状态。
- `./logs.sh [服务名]`：实时查看日志，例如 `./logs.sh play`。
- `./stop.sh`：停止服务，不删除项目、地图、模型、备份或 Docker 数据卷。

## 网络边界

在 `.env` 中配置访问地址、端口和 `BOX_BIND_IP`。公网仅应开放 Play、Player Service 与服主自建登录门户，并通过 HTTPS 反向代理和防火墙保护。Creator / ARENA 与 VOXA 只能本机或可信局域网访问，不能直接部署到公网。

详细变量说明与反向代理要求见仓库文档的“配置参考”和“安装、部署与运维”。不要分享最终生成的 `.env`。
