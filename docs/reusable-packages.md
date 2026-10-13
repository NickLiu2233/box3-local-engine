# 可复用公共包

更新日期：2026-10-13。本轮将三类已被多应用使用的能力移入 packages，并登记 Rush；不发布 npm、不更新正在运行的镜像或安装包。

## 第一批

| 包                        | 模块职责                                           | 使用方                                                |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `@box/player-policy`      | capability、角色规则、审计目录；可选导航与权限菜单 | Player Service、玩家后台、地图授权                    |
| `@box/realtime-client`    | 票据握手、连接共享、重连、取消订阅                 | Play 大厅/地图/状态页、玩家后台                       |
| `@box/deployment-routing` | 浏览器、Node、Next 和 standalone 的资源前缀适配    | Creator/Play/Player Service、VOXA、玩家后台、登录门户 |

前两个包提供独立 ESM/CommonJS 构建和声明；路由包直接提供 CommonJS 与声明。应用通过包名及明确的子入口调用，不再跨应用读取 game/shared 权限或实时源码，也不再读取 internals 下的路由目录。

## 接口边界

- 权限根入口保持纯逻辑。`/navigation`、`/permission-menu` 单独导出；服务端仍验证服主会话，客户端菜单不代替授权。HTTP 类型继续由 `@box/apis` 维护。
- 实时默认接口保持兼容。`createRealtimeClient` 创建独立连接集合，可通过 `requestSession` 使用调用方现有 API 客户端；票据放首帧、同源 socket 与无周期 HTTP 轮询保持不变。
- 路由的根入口、`/browser`、`/server`、`/next-webpack`、`/standalone` 分开。Node 安装必须显式调用，React/JSX 适配只在配置原始 React 别名的构建器中使用，不作为普通 React 替代包。
- 导航 URL 的应用约定与资源 URL 不强行合并；证书、Nginx、数据库、会话存储、Electron 窗口和页面仍留在所属应用。

模块 README：[权限](../packages/player-policy/README.md)、[实时](../packages/realtime-client/README.md)、[路由](../packages/deployment-routing/README.md)。

## 构建与复用

```sh
rush install
rush build --to @box/player-policy
rush build --to @box/realtime-client
rush build --to @box/deployment-routing
```

源码修改包含新依赖时用 `rush update` 并提交锁文件。测试在各包运行 `npm test`，已接入仓库检查；权限、连接与路径回归随模块迁移，没有只移动文件而丢失测试。

其他仓库可使用构建后的 `npm pack` 产物，或在完成正式发布流程后按版本安装。名称和目录本身不代表已发布到 npm；不得直接依赖本仓库的应用目录。公开接口、类型、许可与测试应随包一起维护。

## 发行注意

Docker 和 Next standalone 的路径已同步迁移。登录门户导出模板携带路由源码 vendor 副本，并把 workspace 依赖转换为本地 file 依赖；模板仍可以在仓库外 `npm ci` 和构建。只复制门户目录的旧独立构建方式应改用正式模板导出。

包拆分不自动更新部署产物。发行前仍需重新构建目标镜像/安装包，并验证实际资源路径、登录、权限和 WebSocket；源码和临时目录测试不等于全平台发行验收。

## 本轮验证

2026-10-13 验证记录：

- Rush 工作区检查通过：34 个主项目，包名、目录与本地依赖图一致。
- 三个包构建与测试通过：权限 3 项、实时 4 项、路由 13 项；应用权限回归 11 项、game 实时回归 37 项、门户检查 32 项通过。
- 根目录 210 项测试通过，包含公共包变化触发镜像重建的回归；原路由测试随模块迁移，不删除有效覆盖。
- 三包实际 `npm pack` 后，在仓库外离线安装，CommonJS/ESM 入口检查通过，均包含许可证。standalone 注入后的入口在任意临时目录实际执行通过。
- 最新门户模板在仓库外完成 `npm ci` 与构建；后台、部署管理器和 VOXA 构建通过。
- 玩家后台类型检查仍有 17 项既有诊断；对比提取前的 18 项，没有新增诊断。这不是全仓类型检查通过的声明。
- 实际运行 `rush verify`：格式、lint、门户类型检查及前续测试通过，最终停在既有 Rust 公共路由模块的 rustfmt 检查；本轮未修改这些模块，不能声明全仓验证通过。

本轮没有发布 npm 包、重建部署镜像或覆盖安装包；全平台发行验证仍按[构建与分发](./release-and-distribution.md)执行。
