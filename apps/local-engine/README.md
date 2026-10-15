# Local Engine 控制层

`apps/local-engine` 管理本地地图工程、地图组、发布包、运行时生命周期和离线资源。普通用户优先使用桌面启动器；以下命令仅供源码开发者直接调试。

## 服务与默认入口

| 服务           | 源码命令                                | 默认入口                 | 用途                              |
| -------------- | --------------------------------------- | ------------------------ | --------------------------------- |
| Creator        | `node src/deploy.js creator`            | `http://127.0.0.1:3127/` | 创建、编辑、预览和发布地图        |
| Play           | `node src/deploy.js play`               | `http://127.0.0.1:3121/` | 运行玩家管理后台导入的 `.boxplay` |
| VOXA           | `node src/deploy.js voxa`               | `http://127.0.0.1:3123/` | 模型、皮肤和动画编辑              |
| Player Service | `node src/deploy.js player-service`     | `http://127.0.0.1:3124/` | 玩家身份、后台管理和审计          |
| 参考登录门户   | `node src/deploy.js player-auth-portal` | `http://127.0.0.1:3125/` | 登录/注册参考实现                 |

这些服务可以按需要同时运行。桌面启动器提供“全部”“创作端”“游玩端”三个启动范围，并负责生成各服务的内部地址、公开地址和端口映射。

已有镜像时可用 `:up` 命令跳过构建：

```bash
node src/deploy.js creator-up
node src/deploy.js play-up
node src/deploy.js voxa-up
node src/deploy.js player-service-up
node src/deploy.js player-auth-portal-up
```

停止本仓库的 Compose 服务：

```bash
node src/deploy.js stop
```

## 地图数据与包格式

### 数据根

端口只影响访问地址。根源码开发命令默认使用仓库根目录 `.local-data/apps/local-engine/`，可用 `BOX_DEV_DATA_DIRECTORY` 更换根目录。Docker Compose 使用 `BOX_DATA_DIRECTORY` 下的应用数据目录；桌面启动器使用系统应用数据目录 `runtime/apps/local-engine/` 下的同名目录。不同数据根之间转移作品请使用 `.boxproject`、`.boxplay` 或备份。

Creator 的可编辑工程默认保存在：

```text
.local-data/apps/local-engine/projects/<project-id>/
```

不要手动修改其中的 `project-state.json`、blob、地图组状态或发布清单。换设备编辑时，从 Creator 导出 `.boxproject`；交付服主时，发布并导出 `.boxplay`。

| 格式          | 内容                              | 使用者           |
| ------------- | --------------------------------- | ---------------- |
| `.boxproject` | 可编辑地图工程或完整地图组        | 作者、可信协作者 |
| `.boxplay`    | 不含 `source/` 的不可变地图组快照 | Play 服主        |

一个地图组包含一个主地图和零到多个副地图。每张地图的地形和实体相互隔离，组内成员共享地图组资源和组数据空间。服主或获授权管理员在玩家管理后台审查并导入 `.boxplay`；导入后只能启动、关闭或删除地图，不能修改封面、标题、简介和作者。

Creator 只导出地图数据。镜像和桌面 App 由发行流水线或维护者构建，二者不会写入 `.boxproject` 或 `.boxplay`。

## 离线资源

引擎 blob 默认位于：

```text
apps/local-engine/data/blobs/
```

正常 Creator/Play 构建以及 8 套预置玩家皮肤不依赖 BOX3 云端。若发布 `.boxplay` 时选择“仅引用 OSS”，该地图会依赖发布者自己的对象存储；需要完全离线时必须选择“仅本地资源”。

## 运行与安全边界

- Creator 和 VOXA 只适合本机或可信局域网，不应直接公开到互联网。
- Play 可通过 HTTPS 反向代理公开，HTTP、资源和 WebSocket 使用同一入口。
- Player Service 必须配置 PostgreSQL；Redis 可选。
- Play 只读取已发布快照，不应挂载 Creator 的 `source/` 目录。
- `.env`、数据库、用户项目、地图包、日志和备份都不是镜像内容，不得提交仓库。

## 延伸阅读

- [项目 README](../../README.md)
- [开发入门](../../docs/developer-guide.md)
- [代码规范](../../docs/code-style.md)
