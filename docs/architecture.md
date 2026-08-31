# 系统架构

```text
Creator / Play 浏览器 → apps/game → apps/local-engine → game-server
VOXA → 本地模型工程
Player Service → PostgreSQL（Redis 可选）
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

兼容接口包括地图 UUID、地图组关系、Blob/hash、发布快照、脚本 API 与运行时协议。修改前阅读[对齐基线](./boxes-parity.md)。

## 关键请求

创作者保存时，Creator 将工程状态和资源写入项目目录，并由编辑运行时同步。发布时生成只读 `.boxplay` 快照。服主导入后，Play 只读取快照和运行所需 Blob。

玩家进入地图时，Play 先检查登录与地图开关，再创建或复用地图运行时；game-server 执行服务端脚本并维护权威状态。地图运行时可以按空闲策略回收，Teleport 私有房间会占用同一运行时额度。

## 数据边界

- `.env`：服主配置与密钥；`.runtime.env`：启动器派生的内部配置。
- PostgreSQL：身份、权限、审计及可选地图持久数据的正确性来源。
- Redis：可选缓存，服务应在其不可用时安全降级。
- 桌面启动器只管理 Docker，不参与 Creator、Play 或游戏请求链路。
