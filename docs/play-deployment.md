# 游玩端部署

Play 运行已发布的 `.boxplay`，不读取 Creator 源工程。桌面用户用启动器启动；源码环境使用：

```bash
node apps/local-engine/src/deploy.js play
node apps/local-engine/src/deploy.js play-up
```

## 必需条件

- Player Service 与 PostgreSQL 已启动。
- 设置 `PERMISSION_TOKEN_SECRET`、`BOX_PLAYER_AUTH_API_KEY` 和 `BOX_PLAY_ADMIN_TOKEN`。
- 需要网页导入/删除地图时，设置 `BOX_PLAY_LIBRARY_READ_ONLY=false`。

## 地图管理

服主通过密钥进入管理页，导入前可审查地图组、代码、图片和音频；确认后才安装。主地图与副地图会作为同一地图组运行，在线人数汇总到所属主地图。Play 只能开关或删除地图，不能编辑发布信息或导出地图包。

地图库由 `BOX_PLAY_LIBRARY_DIR` 决定，端口只改变访问地址。Teleport、预热和运行时上限使用 `BOX_PLAY_MAX_RUNTIMES`、`BOX_TELEPORT_MAX_ROOMS`、`BOX_RUNTIME_IDLE_TIMEOUT_MS` 等变量配置。

Play 和登录门户可通过 HTTPS 反向代理面向玩家公开。Linux 无图形服务器同时携带创作端服务，服主可按需启用；不需要远程创作时保持 Creator 与 VOXA 关闭或仅本机监听。

## 启动与检查

启动后访问 Play 首页，确认地图列表、登录跳转和地图进入正常。排查顺序应为：容器健康状态、Player Service、发布包审查结果、Play 日志、地图运行时日志。不要先删除 Docker 卷或地图库。

Play 地图目录可持续保存多个主地图和副地图。运行时启动失败通常与发布包资源不完整、脚本错误、地图过大或运行时额度不足有关；重新发布/导入前先保留失败日志。

## Linux 服务器

无图形包包含 Creator、VOXA、Play、玩家服务、登录门户和 Web 管理端，但没有迁移器或内置数据库。管理端拥有 Docker 控制能力，应仅监听回环地址并通过 SSH 隧道或 VPN 访问。
