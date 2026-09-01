# 系统架构

```text
Creator / Play 浏览器 → apps/game → apps/local-engine → game-server
VOXA → 本地模型工程
Player Service → PostgreSQL
Play 运行时 → PostgreSQL + 可选 Redis + 本地运行时缓存
启动器 / Linux Web 管理端 → Docker Compose
```

| 服务           | 核心职责                         |
| -------------- | -------------------------------- |
| Creator        | 可编辑工程、地图编辑、预览与发布 |
| Play           | 已发布地图大厅与运行时           |
| VOXA           | 本地模型、皮肤和动画编辑         |
| Player Service | 账号、会话、权限、封禁与审计     |
| 登录门户       | 登录/注册参考实现或自建门户      |

Creator 保存 `.boxproject`，Play 导入 `.boxplay`。主图和副图组成地图组：地图状态独立，资源与组数据可共享。服务端脚本是权威逻辑；客户端脚本不可信，不得保存秘密或执行权威判定。

兼容接口包括永久地图 ID、地图组关系、Blob/hash、发布快照、脚本 API 与运行时协议。修改前阅读[对齐基线](./boxes-parity.md)。

## 关键请求

创作者保存时，Creator 将工程状态和资源写入项目目录，并由编辑运行时同步。发布时生成只读 `.boxplay` 快照。服主导入后，Play 只读取快照和运行所需 Blob。

玩家进入地图时，Play 先检查登录与地图开关，再创建或复用地图运行时；game-server 执行服务端脚本并维护权威状态。地图运行时可以按空闲策略回收，Teleport 私有房间会占用同一运行时额度。

## 数据边界

| 数据                       | 位置                                    | 是否可删除                     | 备份要求                  |
| -------------------------- | --------------------------------------- | ------------------------------ | ------------------------- |
| 玩家、会话、权限、审计     | PostgreSQL `box_identity` schema        | 否                             | 必须单独备份 PostgreSQL   |
| 地图脚本持久数据           | PostgreSQL `box_engine` schema          | 否                             | 必须单独备份 PostgreSQL   |
| Creator 工程与 Play 地图库 | 当前部署的数据目录                      | 否                             | 导出工程/游玩包并备份目录 |
| 一次性会话、限流和构建协调 | 可选 Redis DB 0/1                       | 可以，服务会安全降级           | 不作为业务备份            |
| 预烘焙与构建回退缓存       | Docker 卷 `box-play-runtime-cache`      | 可以，删除后首次启动会重新生成 | 不需要                    |
| 服主配置与密钥             | `.env`；启动器派生配置在 `.runtime.env` | 不应随意删除或公开             | 加密保存，禁止入库        |

PostgreSQL 和文件目录保存不同类型的数据，不能互相替代；Redis 与运行时缓存均不是永久数据源。桌面启动器只管理 Docker，不参与 Creator、Play 或游戏请求链路。
