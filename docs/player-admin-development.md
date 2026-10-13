# 后台管理开发说明

后台管理是 Umi + Ant Design 单页应用，入口为 `apps/player-admin/`。它管理玩家、后台账号、权限组、创作权限、地图脚本授权、游玩地图和地图运行容器；它不是游戏运行时，也不替代 Player Service 的服务端授权。

## 模块地图

| 模块                                             | 职责                                          | 不应承担的职责                             |
| ------------------------------------------------ | --------------------------------------------- | ------------------------------------------ |
| `src/pages/index.tsx`                            | Umi 路由入口，只导出后台 Shell                | 页面状态、数据请求或业务流程               |
| `src/pages/shell/player-admin-page.tsx`          | 会话启动、URL 视图切换、顶层布局与跨页面编排  | 具体列表列定义、重复传输类型和底层请求实现 |
| `src/pages/shell/admin-content.tsx`              | 根据 view 选择业务页面，接收协调器数据与回调  | 数据请求、另一份会话或授权规则             |
| `src/pages/<domain>/`                            | 按 access、players、security 等领域组织工作流 | 直接读取 Cookie、绕过统一请求客户端        |
| `src/player-admin-api.ts`                        | 创建统一的 `@box/apis` 客户端并配置 CSRF      | React 页面状态、路由字符串或授权决定       |
| `src/player-admin-types.ts`                      | 从 `@box/apis` 契约派生后台需要的传输类型     | 手工复制服务端 DTO、服务端持久化实现       |
| `src/player-admin-format.ts`                     | 无副作用的时间、容量等展示格式化              | 网络请求或 React 依赖                      |
| `src/pages/access/permission-tree.tsx`           | 权限树及查看/编辑依赖展开                     | 服务端授权；服务端必须独立检查             |
| `src/pages/shell/navigation-menu.tsx`            | 菜单分类、名称和展开状态                      | 重复定义 capability 或服务端访问规则       |
| `packages/player-policy/src/`                    | 能力、菜单、URL view 和可见性规则             | 会话或数据库写入                           |
| `apps/game/pages/api/play-admin/`                | 路由适配、方法限制、进入服务端授权模块        | 仅靠前端隐藏来保护操作                     |
| `apps/game/server/player-admin-authorization.ts` | 后台身份解析与最终授权                        | 页面展示逻辑                               |

`playerAdminApi` 是所有页面的请求入口：它使用 `@box/apis` 生成客户端，统一携带同源 Cookie、为变更请求附加 CSRF header，并把 JSON 错误变成 `ApiClientError`。新增或修改接口时先更新 OpenAPI 契约并运行 `npm run api:generate`，页面再调用生成的 operation 方法；不要重复手写带 ID 的 URL、请求 interface 或另一套通用 fetch 封装。

公共组件、业务 Hook 和逐页复用入口见[后台管理复用索引](./player-admin-code.md)。新增页面先检查已有入口，同一业务的创建与编辑共用字段和校验。

## 启动开发环境

后台管理前端和服务端是两个进程。推荐从仓库根目录启动 Player Service 与开发数据库：

```bash
rush dev-creator --infra
```

上述命令已默认启动 Umi。已有 Player Service、只开发前端时，使用 `rush dev-admin`，或在项目目录运行：

```bash
cd apps/player-admin
npm run dev
```

访问 `http://127.0.0.1:8000/`。开发代理把 `/api` 转发到 `3124`。`401` 表示服务正常但尚未登录；`503` 通常表示 Player Service 无法连接 PostgreSQL 或其下游 Play 管理接口。生产环境不会运行 8000 端口，后台静态文件由 Player Service 提供。

## 页面开发约定

1. 一张页面只负责一个管理工作流。该工作流的查询、表单、确认、保存和刷新可以内聚在页面模块中。
2. 后端返回的记录必须引用 `player-admin-types.ts`。接口字段改变时先改类型和服务端测试，再改页面。
3. 删除、封禁、撤销 Token、销毁或重启容器使用公共 `confirmAdminAction` 确认入口，不得使用浏览器 `confirm`。
4. 长列表必须分页；运行容器列表只显示已启动运行时，刷新由用户显式触发，不轮询页面。
5. 菜单隐藏只是体验优化。每个写接口必须在服务端再次要求相同或更强的能力。
6. 地图组与单图配置必须明确传递 `configurationScope`，不得依据显示名称推断配置范围。

## 权限与 URL

后台 view 存在 URL 的 `?view=<name>`。`packages/player-policy/src/navigation.ts` 同时决定可访问页面、无权限回退页以及浏览器前进/后退的恢复页面。

菜单分类来自 `packages/player-policy/src/permission-menu.ts`，权限树也从同一来源生成。新增后台能力的顺序为：

1. 在 `packages/player-policy/src/policy.ts` 定义 capability 与说明；
2. 在 `packages/player-policy/src/permission-menu.ts` 放入与菜单一致的分类；
3. 在 `packages/player-policy/src/navigation.ts` 为页面声明最小查看能力；
4. 在服务端路由声明相同的查看或编辑能力；
5. 添加前端可见性与服务端拒绝测试；
6. 更新 [Player Service API](./player-service-api.md) 和 [玩家身份与后台管理](./player-identity.md)。

编辑能力依赖对应查看能力。前端选择器会保留查看项；服务端也会为旧权限组中仅存的编辑项补齐查看项，避免升级时意外收回访问权。

## 容器与地图管理

地图包请求由 `apps/game/server/play-library-admin-proxy.ts` 转发到 Play 服务。前端不得把导入包、预览资源或管理 Token 写入本地存储或审计详情。

资源组是独立配置记录，地图容器配置只引用资源组 ID。资源组仍被配置引用时，服务端拒绝删除。保存容量配置不会改造正在运行的进程：新启动或手动重启后的独立 Docker 容器才会应用 CPU、内存、进程、网络和带宽限制。未选资源组时地图使用共享 Node 运行时。

地图授权共用 `admin-map-catalog.ts` 读取两端目录；以固定地图组 ID 绑定授权，不按 edit/play 分开维护。界面状态筛选与状态标签共用同一判断，具体使用规则见[地图授权与脚本处罚 API](./script-moderation.md)。

## 验证清单

改动后台页面至少执行：

```bash
rush build --to @box/player-admin
```

改动权限、路由或数据校验还应执行：

```bash
cd apps/game
rushx test -- player-admin-authorization player-admin-validation player-admin-route
```

改动容器管理还应执行：

```bash
cd apps/game
rushx test -- map-container-admin
```

提交前执行 `rush verify`。手工验收至少覆盖：服主登录、受限账号菜单隐藏与直连 403、分页、创建/编辑/删除确认、Token 一次性展示、地图导入预览、容器重启/销毁，以及刷新后按 URL 恢复正确页面。
