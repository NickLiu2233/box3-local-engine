# 玩家管理后台

这个 Umi/React 应用是 Player Service 的管理界面，处理玩家资料、会话、封禁、创作权限、游玩地图、运行时与管理账号。它不拥有独立的用户数据库，不能仅启动前端就提供管理能力。

## 首次进入

根开发栈 `npm run dev:infra` 默认同时启动 Player Service `3124` 和本界面 `8000`。前端请求经开发代理访问 Player Service；只调试界面可用根 `npm run dev:admin`，同时保持后端在运行。

源码首次使用在根 `.env` 设置随机的 `BOX_PLAY_ADMIN_TOKEN`（至少 16 字符），重启开发栈，打开 `http://127.0.0.1:8000/`，选择“服主登录”。随后先创建权限组，再创建选择该组的独立管理账号；初始管理密码至少 12 位。日常管理员用“管理员登录”，玩家门户注册的账号不能直接用于该入口。

需要创作时先在登录门户注册玩家，再由服主在“创作管理 → 创作权限 → 新增”选择玩家，开启创作端并授予相应能力。逐步教程见[首个作品](../../docs/first-project.md)。`BOX_SERVER_MANAGER_TOKEN` 用于 Linux Web 部署管理器，不能用来登录这里。

## 权限与数据

- owner 管理权限组、管理账号与地图授权；管理员只看见权限组允许的功能。
- Creator 与 VOXA 使用玩家的创作能力，不使用后台管理会话。
- Play 地图来自“游玩管理 → 游玩地图 → 导入游玩包”，先检查 `.boxplay` 的脚本和媒体，再确认导入并开放地图组。
- 所有操作仍由服务端授权；隐藏按钮不能代替 API 鉴权。

`src/pages/shell/` 组装导航和页面，`src/pages/access/` 管理 owner/权限组，`src/pages/creator/` 管理创作授权，`src/pages/maps/` 管理游玩包。`src/player-admin-api.ts` 使用 `@box/apis` 客户端；权限判断由共享策略包负责。

## 开发检查

从仓库根执行：

```sh
npm --prefix apps/player-admin run typecheck
npm --prefix apps/player-admin run build
npm --prefix apps/game test -- --runInBand
npm run verify
```

当前模块没有独立 `test` 脚本；权限和管理 API 回归在 game 和公共策略包。真实数据库持久化与普通玩家/管理员隔离验收见[测试指南](../../docs/testing.md)。演示截图、日志和测试资料不要包含真实玩家信息、Cookie 或服主令牌。
