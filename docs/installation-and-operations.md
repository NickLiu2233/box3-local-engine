# 安装与运维

BOX3 Engine 有两种使用方式：桌面启动器适合 Windows、macOS 和 Linux 桌面；无图形 Linux 服务器使用 Web 管理端。Play 与登录门户可以面向玩家公开；Creator 和 VOXA 默认仅本机访问，远程创作需要额外的 HTTPS、访问控制和权限保护。

## 最小要求

- Docker Compose v2；桌面端还需 Docker Desktop。
- PostgreSQL：玩家、权限和地图持久数据的必需存储；桌面启动器可自动管理，Linux Web 部署需自行提供。
- Redis：可选缓存；桌面启动器支持不启用、内置或外部 Redis。

桌面用户解压完整离线包后打开启动器，选择 PostgreSQL 和 Redis 模式，再按需启动“创作端”“游玩端”或“全部服务”。选择内置服务时，首次会确认并联网下载对应镜像；三个独立密钥及内置服务密码由启动器自动生成。Linux 服务器包包含 Creator、VOXA、Play、玩家服务、登录门户与 Web 管理端，不包含迁移器或内置 PostgreSQL/Redis。

## 日常流程

1. 在 Creator 创建或导入 `.boxproject`。
2. 发布并导出 `.boxplay`。
3. 服主在 Play 审查并导入 `.boxplay`。
4. 玩家从 Play 首页登录并进入地图。

端口只改变访问地址。工程与游玩地图保存在当前部署的数据目录；桌面启动器与开发工作区的数据不会自动同步。

## 运维原则

- 升级前导出工程、启动器备份和 PostgreSQL 备份。
- 不要把 `.env`、地图、数据库卷、备份或日志提交仓库或上传 Release。
- 出现问题先看服务状态和 Docker 容器日志；不要通过删除卷、清空数据库或删除地图目录排障。

| 需要保护的数据           | 推荐方式                               |
| ------------------------ | -------------------------------------- |
| PostgreSQL               | 定期快照或 `pg_dump`，并实际验证恢复   |
| Creator 工程与 VOXA 工程 | 导出工程包，同时备份启动器运行数据目录 |
| Play 地图库              | 保留原始 `.boxplay`，并备份地图库目录  |
| Redis 与运行时缓存       | 无需作为永久备份；故障后允许重新生成   |

详细操作分别见[图形化部署管理器](./graphical-deployment-manager.md)、[Linux Web 管理端](./linux-web-manager.md)、[游玩端部署](./play-deployment.md)和[配置参考](./configuration-reference.md)。

## 健康检查

服务总览应显示 Play、Player Service 和登录门户健康。公网部署还应从外部网络验证 HTTPS、登录回跳、静态资源和 WebSocket。首次部署时先用一张小地图完成登录、进入、退出和重新进入测试，再导入大型地图。

桌面包与服务器包均支持离线镜像导入；镜像架构必须和运行机器一致。Windows 使用 x64 包，Apple Silicon 使用 macOS arm64 包，Linux 按 amd64/arm64 选择。
