# 安装与运维

BOX3 Engine 有两种使用方式：桌面启动器适合 Windows、macOS 和 Linux 桌面；无图形 Linux 服务器使用 Web 管理端。Play 与登录门户可以面向玩家公开；Creator 和 VOXA 默认仅本机访问，远程创作需要额外的 HTTPS、访问控制和权限保护。

源码目前先通过邀请提供，安装包按维护者提供的试用渠道获取；运行程序不需要源码邀请或许可证激活。渠道是否开放与 MIT 代码许可分开处理。

## 最小要求

- Linux 无图形服务器只需 Docker Engine 与 Docker Compose v2，不需要 Node.js、Rust 或桌面环境；桌面端使用 Docker Desktop。
- PostgreSQL：玩家、权限和地图持久数据的必需存储；桌面启动器和 Linux Web 管理端都可自动管理，也可连接外部服务。
- Redis：可选缓存；桌面启动器支持不启用、内置或外部 Redis。

桌面用户解压轻量启动器后打开，选择 PostgreSQL 和 Redis 模式，再按需启动“创作端”“游玩端”或“全部服务”。服务镜像在需要时下载并校验；三个独立密钥及内置服务密码由启动器自动生成。Linux 服务器 ZIP 不内置 Docker 镜像，安装时下载 Web 管理端自身镜像，其余业务镜像及 PostgreSQL、Redis、托管 Nginx 都按需下载并显示下载进度。

## 日常流程

1. 在 Creator 创建或导入 `.boxproject`。
2. 发布并导出 `.boxplay`。
3. 服主或获授权管理账号在后台管理的“游玩管理 → 游玩地图”审查并导入 `.boxplay`。
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

从空白 Linux 服务器开始时，直接按照[从纯 Linux 系统部署 BOX3 Engine](./linux-web-manager.md)执行。桌面端操作见[图形化部署管理器](./graphical-deployment-manager.md)，公网服务见[游玩端部署](./play-deployment.md)，所有变量见[配置参考](./configuration-reference.md)。

## 健康检查

服务总览应显示 Play、Player Service 和登录门户健康。公网部署还应从外部网络验证 HTTPS、登录回跳、静态资源和 WebSocket。首次部署时先用一张小地图完成登录、进入、退出和重新进入测试，再导入大型地图。

桌面启动器不内置镜像归档。升级时先替换启动器，再启动所需服务；新启动器按服务检查镜像摘要，本机已有相同镜像时直接复用（即使启动器版本变了），只下载发生变化或缺失的镜像。镜像包按服务独立发布，使用归档 SHA-256 命名，下载后校验大小、SHA-256 与导入后的 Docker 镜像 ID。

更新前保留旧镜像及回滚标签；新服务通过 Docker 健康检查后，才清理本次被替换且没有任何容器使用的旧镜像。停止的容器也算使用中；存在其他项目镜像标签时保留旧镜像，不使用强制删除。导入失败保留已校验下载文件；导入成功后删除下载归档。清理失败会保留记录，下次成功启动后重试。地图、配置、数据库、证书、备份和数据卷不在清理范围。

Linux 安装脚本先下载 Web 管理端自身镜像，再按需下载缺少的业务镜像。镜像架构必须和运行机器一致。Windows 按机器选择 x64/ARM64 包，Apple Silicon 使用 macOS arm64 包，Linux 按 amd64/arm64 选择。

### 桌面镜像的本地测试

在仓库根目录生成独立镜像包与清单（无需导入或替换本机 Docker 镜像）：

```bash
node scripts/build-image-downloads.js apps/local-engine/dist/images/box-local-engine-images-v0.3.0-linux-arm64.tar.gz arm64 apps/local-engine/dist/images/box-local-engine-images-v0.3.0-linux-arm64.json
```

使用该 JSON 清单构建轻量启动器；没有清单时，桌面打包脚本会从输入归档生成。CI 桌面构建机只下载 JSON 清单，不需要下载完整归档或运行 Docker。服务器打包继续使用完整归档。

macOS 本机测试时，把拆分的包复制进下载缓存，再打开对应测试启动器启动服务：

```bash
mkdir -p ~/Library/Caches/com.box.engine.manager/engine-images
cp apps/local-engine/dist/images/box-local-engine-image-*-arm64-*.tar.gz ~/Library/Caches/com.box.engine.manager/engine-images/
```

缓存文件只有与启动器内置清单匹配并通过完整性校验时才会使用。这条流程测试校验、导入与服务切换；HTTP 下载中断、错误响应和重试使用原生 `image_download` 测试中的本地 HTTP 服务验证。
