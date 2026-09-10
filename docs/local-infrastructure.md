# 本地基础设施

PostgreSQL 是必需的永久数据源；Redis 和 Play 运行时缓存只用于加速与短期协调。三者不能互相替代。

| 组件                     | 保存内容                                         | 生命周期与故障行为                                  |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| PostgreSQL               | 玩家、会话、权限、审计、地图与地图组脚本持久数据 | 必须备份；不可通过删除卷排障                        |
| Redis DB 0               | 一次性运行时会话、会话创建限流计数               | 可选；不可用时运行时使用内存回退                    |
| Redis DB 1               | 短期构建结果、并发构建锁                         | 可选；不可用时使用持久本地构建回退                  |
| `box-play-runtime-cache` | 预烘焙产物和构建回退缓存                         | 可删除；下次启动会重建，首次进入地图可能变慢        |
| Creator/Play 文件目录    | 可编辑工程、Blob、发布记录和已导入 `.boxplay`    | 必须单独备份；不属于 PostgreSQL，也不属于运行时缓存 |

开发环境可启动仓库内基础设施：

```bash
pnpm infra
pnpm infra:stop
```

桌面启动器和 Linux Web 管理端都可选择内置或外部 PostgreSQL，并可关闭、内置或外接 Redis。内置服务未安装时可直接下载；管理端使用随机身份和独立 Docker 卷，完成后显示本机连接信息。端口只绑定 `127.0.0.1`，不会向局域网或公网开放。Linux Web 离线包不携带基础服务镜像，选择内置模式时需要联网拉取。

从旧版本升级后，Docker Desktop 可能仍显示 `box-local-engine_box-play-storage`。新版不再使用它；停止 Play 并确认正在使用 `box-play-runtime-cache` 后，可以删除旧卷。不要删除 `box-managed-postgres-data` 或外部 PostgreSQL 的数据卷。

本地 `pnpm infra` 只适合开发测试。生产环境应设置独立账号、强密码、TLS 和备份策略；服务重启、Redis 清理、运行时缓存或地图重新导入都不能替代数据库备份。连接与 SSL 见[配置参考](./configuration-reference.md)，数据隔离见[PostgreSQL 数据空间](./postgresql-data-storage.md)。
